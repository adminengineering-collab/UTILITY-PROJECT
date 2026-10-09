import { FuelEntry, FuelType } from '../types/boiler';
import { FUEL_TYPES } from '../data/initialData';

export interface ParseResult {
  entries: FuelEntry[];
  steamData: Record<string, number>;
  summary: {
    rowCount: number;
    datesFound: string[];
    fuelCounts: Record<string, number>;
    totalKonsumsi: number;
    totalHarga: number;
  };
  errors: string[];
}

/**
 * Converts a Google Sheets URL (edit, share, pub) into a direct CSV export endpoint.
 */
export function convertToGoogleSheetsCsvUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  // Google Apps Script Web App URL - direct fetch
  if (trimmed.includes('script.google.com')) {
    return trimmed;
  }

  // Already a direct CSV link or published CSV
  if (trimmed.includes('output=csv') || trimmed.includes('format=csv')) {
    return trimmed;
  }

  // Standard Google Sheets edit / view URL:
  // e.g. https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    const sheetId = match[1];
    // Check if gid is specified
    const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  }

  // Published to web link:
  // e.g. https://docs.google.com/spreadsheets/d/e/2PACX-1vQ.../pubhtml
  const pubMatch = trimmed.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
  if (pubMatch && pubMatch[1]) {
    const pubId = pubMatch[1];
    return `https://docs.google.com/spreadsheets/d/e/${pubId}/pub?output=csv`;
  }

  return trimmed;
}

/**
 * Cleans currency and numeric strings (e.g. "Rp 108.130.980", "1.750", "5,26")
 */
function cleanNumber(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const s = val.toString().trim().replace(/Rp|\s/gi, '');
  if (!s || s === '-') return 0;

  // Indonesian format: 1.234,56 (dot as thousand, comma as decimal)
  // Or standard format: 1,234.56
  if (s.includes('.') && s.includes(',')) {
    if (s.indexOf('.') < s.indexOf(',')) {
      // 1.234,56 -> 1234.56
      return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
    } else {
      // 1,234.56 -> 1234.56
      return parseFloat(s.replace(/,/g, '')) || 0;
    }
  }

  if (s.includes(',')) {
    return parseFloat(s.replace(',', '.')) || 0;
  }

  // Check if it's an integer with thousand dots like 51.982.650
  if (s.includes('.')) {
    const parts = s.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      // e.g. 51.982.650 or 1.750
      return parseFloat(s.replace(/\./g, '')) || 0;
    }
    return parseFloat(s) || 0;
  }

  return parseFloat(s) || 0;
}

/**
 * Robust date parser supporting Indonesian format DD/MM/YYYY, Excel serial dates,
 * ISO format, and carrying over date from previous row for merged cells.
 */
export function parseSpreadsheetDate(raw: any, lastValidDate = ''): string {
  if (raw === null || raw === undefined) return lastValidDate;
  let s = raw.toString().trim().replace(/^"|"$/g, '');
  if (!s || s === '-' || s === '""') return lastValidDate;

  // Remove time component if present (e.g. "01/02/2026 00:00:00")
  if (s.includes(' ')) {
    s = s.split(' ')[0].trim();
  }
  if (s.includes('T')) {
    s = s.split('T')[0].trim();
  }

  // 1. Check if it's an Excel serial date number (e.g. 45000 to 48000)
  const num = Number(s);
  if (!isNaN(num) && num > 30000 && num < 65000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const targetDate = new Date(excelEpoch.getTime() + num * 86400000);
    return targetDate.toISOString().slice(0, 10);
  }

  // 2. Format DD/MM/YYYY or D/M/YYYY (Standard in Indonesia and Google Sheets screenshot)
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      const d = parts[0].trim().padStart(2, '0');
      const m = parts[1].trim().padStart(2, '0');
      let y = parts[2].trim();
      if (y.length === 2) y = '20' + y;
      const dayNum = parseInt(d, 10);
      const monthNum = parseInt(m, 10);
      if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
        return `${y}-${m}-${d}`;
      }
    }
  }

  // 3. Format YYYY-MM-DD or DD-MM-YYYY
  if (s.includes('-')) {
    const parts = s.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return s.slice(0, 10);
      } else {
        const d = parts[0].trim().padStart(2, '0');
        const m = parts[1].trim().padStart(2, '0');
        let y = parts[2].trim();
        if (y.length === 2) y = '20' + y;
        return `${y}-${m}-${d}`;
      }
    }
  }

  // 4. Format DD.MM.YYYY
  if (s.includes('.')) {
    const parts = s.split('.');
    if (parts.length === 3) {
      const d = parts[0].trim().padStart(2, '0');
      const m = parts[1].trim().padStart(2, '0');
      let y = parts[2].trim();
      if (y.length === 2) y = '20' + y;
      if (y.length === 4) {
        return `${y}-${m}-${d}`;
      }
    }
  }

  return lastValidDate || s;
}

/**
 * Normalizes fuel type name string to standard FuelType enum
 */
function normalizeFuelType(raw: string): FuelType {
  const upper = raw.trim().toUpperCase();
  if (upper.includes('WOOD') || upper.includes('KAYU')) return 'WOOD PELLET';
  if (upper.includes('CANGKANG') || upper.includes('SAWIT')) return 'CANGKANG';
  if (upper.includes('DUST') || upper.includes('SERBUK')) return 'DUST PELLET';
  if (upper.includes('KOPI') || upper.includes('COFFEE')) return 'KOPI PELLET';
  return 'WOOD PELLET';
}

/**
 * Parses raw text from CSV or Tab-Separated copied cells from Google Sheets / Excel.
 */
export function parseSpreadsheetText(rawText: string): ParseResult {
  const errors: string[] = [];
  const entries: FuelEntry[] = [];
  const steamData: Record<string, number> = {};
  const fuelCounts: Record<string, number> = {
    'CANGKANG': 0,
    'WOOD PELLET': 0,
    'DUST PELLET': 0,
    'KOPI PELLET': 0,
  };
  const datesSet = new Set<string>();
  let totalKonsumsi = 0;
  let totalHarga = 0;

  if (!rawText || !rawText.trim()) {
    return {
      entries: [],
      steamData: {},
      summary: { rowCount: 0, datesFound: [], fuelCounts, totalKonsumsi: 0, totalHarga: 0 },
      errors: ['Teks spreadsheet kosong.'],
    };
  }

  // Check if rawText is JSON (from Google Apps Script Web App doGet)
  const trimmedText = rawText.trim();
  if (trimmedText.startsWith('{') || trimmedText.startsWith('[')) {
    try {
      const json = JSON.parse(trimmedText);
      const rawList: any[] = Array.isArray(json) ? json : (json.entries || json.data || []);
      const jsonSteam: Record<string, number> = json.steamData || {};

      if (Array.isArray(rawList) && rawList.length > 0) {
        let counter = 1;
        rawList.forEach((item: any) => {
          const pt = String(item.namaPt || item.pt || item.supplier || '').trim();
          if (!pt) return;
          const fuel = normalizeFuelType(String(item.bahanBakar || item.fuel || 'WOOD PELLET'));
          const tgl = parseSpreadsheetDate(item.tanggal || item.date || '');
          const konsumsi = cleanNumber(item.konsumsi || item.qty || item.kg || 0);
          const harga = cleanNumber(item.harga || item.rp || 0);
          const totalHargaCalc = cleanNumber(item.totalHarga || item.total) || (konsumsi * harga);
          const mc = cleanNumber(item.mc || 6.5);
          const calori = item.calori ? cleanNumber(item.calori) : null;

          if (tgl) datesSet.add(tgl);

          entries.push({
            id: item.id || `appscript-row-${Date.now()}-${counter}`,
            no: Number(item.no) || counter++,
            namaPt: pt.toUpperCase(),
            bahanBakar: fuel,
            tanggal: tgl,
            mc,
            calori,
            konsumsi,
            harga,
            totalHarga: totalHargaCalc,
          });

          fuelCounts[fuel] = (fuelCounts[fuel] || 0) + 1;
          totalKonsumsi += konsumsi;
          totalHarga += totalHargaCalc;
        });

        // Copy steam data
        Object.entries(jsonSteam).forEach(([d, val]) => {
          steamData[d] = Number(val) || 0;
        });

        if (entries.length > 0) {
          return {
            entries,
            steamData,
            summary: {
              rowCount: entries.length,
              datesFound: Array.from(datesSet).sort(),
              fuelCounts,
              totalKonsumsi,
              totalHarga,
            },
            errors: [],
          };
        }
      }
    } catch {
      // Fallback to CSV / TSV text parsing
    }
  }

  const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return {
      entries: [],
      steamData: {},
      summary: { rowCount: 0, datesFound: [], fuelCounts, totalKonsumsi: 0, totalHarga: 0 },
      errors: ['Tidak ada baris yang ditemukan.'],
    };
  }

  // Detect delimiter: tab (\t) or comma (,) or semicolon (;)
  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) {
    delimiter = '\t';
  } else if (firstLine.includes(';') && !firstLine.includes(',')) {
    delimiter = ';';
  }

  // Helper to split row handling quotes
  const splitRow = (line: string): string[] => {
    if (delimiter === '\t') {
      return line.split('\t').map((c) => c.replace(/^"|"$/g, '').trim());
    }
    // Simple CSV parser supporting quotes
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  };

  // Check header row index
  let headerRowIndex = 0;
  let colMap = {
    no: 0,
    namaPt: 1,
    bahanBakar: 2,
    tanggal: 3,
    mc: 4,
    calori: 5,
    konsumsi: 6,
    harga: 7,
    totalHarga: 8,
    steamOut: 10,
  };

  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const cols = splitRow(lines[i]).map((c) => c.toUpperCase());
    const hasPt = cols.some((c) => c.includes('NAMA PT') || c.includes('VENDOR') || c.includes('PT') || c.includes('SUPPLIER'));
    const hasBahan = cols.some((c) => c.includes('BAHAN') || c.includes('FUEL') || c.includes('PELLET') || c.includes('CANGKANG'));
    const hasTgl = cols.some((c) => c.includes('TANGGAL') || c.includes('DATE'));

    if (hasPt || (hasBahan && hasTgl)) {
      headerRowIndex = i;
      // Map columns dynamically if headers match
      cols.forEach((col, idx) => {
        if (col.includes('NAMA PT') || col.includes('VENDOR') || col.includes('SUPPLIER')) {
          colMap.namaPt = idx;
        } else if (col.includes('BAHAN BAKAR') || col === 'BAHAN' || col === 'FUEL') {
          colMap.bahanBakar = idx;
        } else if (col.includes('TANGGAL') || col.includes('DATE') || col === 'TGL') {
          colMap.tanggal = idx;
        } else if (col.includes('MC') || col.includes('MOISTURE')) {
          colMap.mc = idx;
        } else if (col.includes('CALORI') || col.includes('KALORI')) {
          colMap.calori = idx;
        } else if ((col.includes('KONSUMSI') || col === 'KG' || col.includes('PEMAKAIAN')) && !col.includes('TOTAL') && !col.includes('HARGA') && !col.includes('TON')) {
          colMap.konsumsi = idx;
        } else if (col.includes('HARGA') && !col.includes('TOTAL') && !col.includes('TON')) {
          colMap.harga = idx;
        } else if (col.includes('TOTAL HARGA') && !col.includes('TANGGAL')) {
          colMap.totalHarga = idx;
        } else if (col.includes('STEAM OUT') || col.includes('STEAM')) {
          colMap.steamOut = idx;
        }
      });
      break;
    }
  }

  let rowCounter = 1;
  let lastValidDate = '';

  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const rawCols = splitRow(lines[i]);
    if (rawCols.length < 4) continue;

    const ptCandidate = rawCols[colMap.namaPt] || rawCols[1] || '';
    if (!ptCandidate || ptCandidate.toUpperCase().includes('TOTAL') || ptCandidate.toUpperCase().includes('NAMA PT')) {
      continue;
    }

    const rawFuel = rawCols[colMap.bahanBakar] || rawCols[2] || 'WOOD PELLET';
    const fuel = normalizeFuelType(rawFuel);

    // Tanggal with robust parsing and merged-cell carry over
    const rawDate = rawCols[colMap.tanggal] || rawCols[3] || '';
    const parsedDate = parseSpreadsheetDate(rawDate, lastValidDate);
    if (parsedDate) {
      lastValidDate = parsedDate;
      datesSet.add(parsedDate);
    }

    const mc = cleanNumber(rawCols[colMap.mc] || rawCols[4]);
    const rawCalori = rawCols[colMap.calori] || rawCols[5];
    const calori = rawCalori && rawCalori !== '-' ? cleanNumber(rawCalori) : null;
    const konsumsi = cleanNumber(rawCols[colMap.konsumsi] || rawCols[6]);
    const harga = cleanNumber(rawCols[colMap.harga] || rawCols[7]);
    const totalHargaCalc = cleanNumber(rawCols[colMap.totalHarga] || rawCols[8]) || konsumsi * harga;

    // Steam out if available
    const rawSteam = rawCols[colMap.steamOut] || (rawCols.length > 9 ? rawCols[9] : '');
    const steamNum = cleanNumber(rawSteam);
    if (steamNum > 0 && !steamData[parsedDate]) {
      steamData[parsedDate] = steamNum;
    }

    if (konsumsi > 0 || harga > 0) {
      entries.push({
        id: `sync-row-${Date.now()}-${rowCounter}`,
        no: rowCounter++,
        namaPt: ptCandidate.trim().toUpperCase(),
        bahanBakar: fuel,
        tanggal: parsedDate,
        mc: mc || 6.5,
        calori,
        konsumsi,
        harga,
        totalHarga: totalHargaCalc,
      });

      fuelCounts[fuel] = (fuelCounts[fuel] || 0) + 1;
      totalKonsumsi += konsumsi;
      totalHarga += totalHargaCalc;
    }
  }

  if (entries.length === 0) {
    errors.push('Tidak dapat mengenali format baris spreadsheet. Pastikan kolom memuat Nama PT, Bahan Bakar, Tanggal, Konsumsi, dan Harga.');
  }

  return {
    entries,
    steamData,
    summary: {
      rowCount: entries.length,
      datesFound: Array.from(datesSet).sort(),
      fuelCounts,
      totalKonsumsi,
      totalHarga,
    },
    errors,
  };
}
