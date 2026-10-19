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

  // Google Apps Script Web App URL - direct fetch & ensure /exec instead of /dev
  if (trimmed.includes('script.google.com')) {
    // If user copied test deployment link ending in /dev, automatically replace with /exec
    return trimmed.replace(/\/dev(\b|\?|$)/, '/exec$1');
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
 * Safely fetches spreadsheet text or JSON from Google Sheets CSV export, Publish-to-Web, or Apps Script Web App.
 * Handles CORS and redirect restrictions with intelligent fallback proxies and diagnostic messages.
 */
export async function fetchSpreadsheetContent(rawUrl: string): Promise<string> {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error('Tautan Google Sheets atau Web App belum dimasukkan.');
  }

  const endpoint = convertToGoogleSheetsCsvUrl(trimmed);

  const fetchWithTimeout = async (url: string, timeoutMs = 8000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  let responseText = '';
  let lastError: any = null;

  // 1. Direct fetch attempt with cachebuster
  try {
    const cacheBuster = `${endpoint}${endpoint.includes('?') ? '&' : '?'}_t=${Date.now()}`;
    const res = await fetchWithTimeout(cacheBuster, 8000);
    if (res.ok) {
      responseText = await res.text();
    } else {
      lastError = new Error(`Server Google merespons status ${res.status}`);
    }
  } catch (err) {
    lastError = err;
  }

  // 2. Direct fetch without query parameters
  if (!responseText) {
    try {
      const res = await fetchWithTimeout(endpoint, 8000);
      if (res.ok) {
        responseText = await res.text();
      }
    } catch (err) {
      lastError = err;
    }
  }

  // 3. Fallback proxies for CORS restrictions
  if (!responseText) {
    const proxyBuilders = [
      (target: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}`,
      (target: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
    ];

    for (const buildProxy of proxyBuilders) {
      try {
        const proxyUrl = buildProxy(endpoint);
        const res = await fetchWithTimeout(proxyUrl, 9000);
        if (res.ok) {
          const txt = await res.text();
          if (txt && !txt.includes('408 Request Time-out') && !txt.includes('Gateway Timeout')) {
            responseText = txt;
            break;
          }
        }
      } catch (err) {
        lastError = err;
      }
    }
  }

  if (!responseText) {
    throw new Error(
      lastError?.message ||
        'Gagal terhubung ke Google Sheets. Pastikan akses disetel ke "Anyone with link can view" atau gunakan "Publikasikan ke Web".'
    );
  }

  // 4. Validate if response is Google Sign-in HTML (Restricted access)
  const checkLower = responseText.toLowerCase();
  if (
    checkLower.includes('accounts.google.com') ||
    checkLower.includes('sign in - google accounts') ||
    (checkLower.includes('<!doctype html') && checkLower.includes('service login'))
  ) {
    throw new Error(
      'Google Sheets meminta login (Akses Dibatasi). Buka spreadsheet Anda > Klik "Bagikan (Share)" di pojok kanan atas > Ubah Akses Umum menjadi "Siapa saja yang memiliki link". Jika menggunakan Apps Script, pastikan saat Deploy pilih "Who has access: Anyone".'
    );
  }

  return responseText;
}

/**
 * Robust currency and numeric sanitizer for Indonesian Rupiah (Rp, Rp., IDR), 
 * accounting formats, thousands separators (dots or commas), and decimals.
 */
export function cleanNumber(val: any): number {
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  if (val === null || val === undefined) return 0;

  let s = val.toString().trim();
  if (!s || s === '-' || s === '--' || s === 'N/A' || s === 'n/a' || s === 'null') return 0;

  // Remove wrapping quotes and non-breaking spaces (\u00A0)
  s = s.replace(/^["']|["']$/g, '').replace(/\u00A0/g, ' ').trim();

  // Handle accounting parentheses: "(100.000)" or "(Rp 100.000)" -> negative
  let isNegative = false;
  if (/^\(.*\)$/.test(s)) {
    isNegative = true;
    s = s.slice(1, -1).trim();
  } else if (s.startsWith('-')) {
    isNegative = true;
    s = s.slice(1).trim();
  }

  // Remove currency prefixes & suffixes: "Rp.", "Rp", "IDR", "/kg", "/ton", "kg", "ton", "%", "rupiah"
  s = s.replace(/^(Rp\.|rp\.|RP\.|Rp|rp|RP|IDR|idr)\s*/gi, '');
  s = s.replace(/\s*(IDR|idr|Rp|rp|RP)$/gi, '');
  s = s.replace(/\s*(\/kg|\/ton|kg|ton|%|rupiah)\s*$/gi, '');
  // Remove all remaining whitespaces
  s = s.replace(/\s+/g, '');

  if (!s || s === '-' || s === '.') return 0;

  // Case 1: Contains both '.' and ',' (e.g. "108.130.980,00" or "108,130,980.00")
  if (s.includes('.') && s.includes(',')) {
    const firstDot = s.indexOf('.');
    const firstComma = s.indexOf(',');
    if (firstDot < firstComma) {
      // Indonesian format: 1.234.567,89 (dots are thousands, comma is decimal)
      const cleaned = s.replace(/\./g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : (isNegative ? -num : num);
    } else {
      // US format: 1,234,567.89 (commas are thousands, dot is decimal)
      const cleaned = s.replace(/,/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : (isNegative ? -num : num);
    }
  }

  // Case 2: Only contains dots '.' (e.g. "108.130.980" or "1.750" or "15.5")
  if (s.includes('.')) {
    const parts = s.split('.');
    // Multiple dots: e.g. "108.130.980" -> definitely thousand separators!
    if (parts.length > 2) {
      const num = parseFloat(s.replace(/\./g, ''));
      return isNaN(num) ? 0 : (isNegative ? -num : num);
    }
    // Single dot: e.g. "1.750" (Rupiah/weight thousand) vs "15.5" (decimal)
    if (parts.length === 2) {
      // If exactly 3 digits after dot and not leading with 0, it is an Indonesian thousand separator:
      if (parts[1].length === 3 && parts[0] !== '0') {
        const num = parseFloat(s.replace(/\./g, ''));
        return isNaN(num) ? 0 : (isNegative ? -num : num);
      }
      // Otherwise standard decimal
      const num = parseFloat(s);
      return isNaN(num) ? 0 : (isNegative ? -num : num);
    }
  }

  // Case 3: Only contains commas ',' (e.g. "108,130,980" or "1,750" or "1500,50")
  if (s.includes(',')) {
    const parts = s.split(',');
    // Multiple commas: e.g. "108,130,980" -> US thousand separators!
    if (parts.length > 2) {
      const num = parseFloat(s.replace(/,/g, ''));
      return isNaN(num) ? 0 : (isNegative ? -num : num);
    }
    // Single comma:
    if (parts.length === 2) {
      // If 1 or 2 digits after comma or starts with 0: Indonesian decimal e.g. "1500,50" or "0,5"
      if (parts[1].length !== 3 || parts[0] === '0') {
        const num = parseFloat(s.replace(',', '.'));
        return isNaN(num) ? 0 : (isNegative ? -num : num);
      }
      // If exactly 3 digits after comma e.g. "1,750" -> US thousand separator
      const num = parseFloat(s.replace(/,/g, ''));
      return isNaN(num) ? 0 : (isNegative ? -num : num);
    }
  }

  // Plain numeric string
  const num = parseFloat(s);
  return isNaN(num) ? 0 : (isNegative ? -num : num);
}

const INDO_MONTH_NAMES: Record<string, string> = {
  januari: '01', jan: '01', january: '01',
  februari: '02', feb: '02', february: '02',
  maret: '03', mar: '03', march: '03',
  april: '04', apr: '04',
  mei: '05', may: '05',
  juni: '06', jun: '06', june: '06',
  juli: '07', jul: '07', july: '07',
  agustus: '08', agu: '08', ags: '08', aug: '08', august: '08',
  september: '09', sep: '09', sept: '09',
  oktober: '10', okt: '10', oct: '10', october: '10',
  november: '11', nov: '11',
  desember: '12', des: '12', dec: '12', december: '12',
};

/**
 * Robust date parser supporting Indonesian format DD/MM/YYYY, Indonesian month names (1 Agustus 2026, 30 September 2026),
 * US MM/DD/YYYY, Excel serial dates, ISO format, and carrying over date from previous row for merged cells.
 */
export function parseSpreadsheetDate(raw: any, lastValidDate = ''): string {
  if (raw === null || raw === undefined) return lastValidDate;
  let s = raw.toString().trim().replace(/^"|"$/g, '');
  if (!s || s === '-' || s === '""') return lastValidDate;

  // Remove time component if present (e.g. "01/02/2026 00:00:00")
  if (s.includes(' ') && !s.match(/[a-zA-Z]/)) {
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

  // 2. Check if already standard ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }

  // 3. Text format with month names: "1 Agustus 2026", "30 September 2026", "01-Agu-2026", "1-Aug-2026"
  const textTokens = s.toLowerCase().split(/[\s,.-]+/);
  if (textTokens.length >= 3) {
    let day = '';
    let month = '';
    let year = '';

    for (const token of textTokens) {
      if (INDO_MONTH_NAMES[token]) {
        month = INDO_MONTH_NAMES[token];
      } else if (/^\d{4}$/.test(token)) {
        year = token;
      } else if (/^\d{1,2}$/.test(token)) {
        if (!day) day = token.padStart(2, '0');
        else if (!year) year = '20' + token.padStart(2, '0');
      }
    }

    if (day && month && year) {
      return `${year}-${month}-${day}`;
    }
  }

  // 4. Format DD/MM/YYYY or MM/DD/YYYY
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      const p1 = parseInt(parts[0].trim(), 10);
      const p2 = parseInt(parts[1].trim(), 10);
      let y = parts[2].trim();
      if (y.length === 2) y = '20' + y;

      // Smart detection: If p2 > 12 and p1 <= 12, it is MM/DD/YYYY (e.g. 08/25/2026 or 09/30/2026)
      if (p2 > 12 && p1 <= 12) {
        return `${y}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
      }

      // Default Indonesian DD/MM/YYYY (e.g. 01/08/2026 or 30/09/2026)
      return `${y}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    }
  }

  // 5. Format YYYY-MM-DD or DD-MM-YYYY
  if (s.includes('-')) {
    const parts = s.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return s.slice(0, 10);
      } else {
        const p1 = parseInt(parts[0].trim(), 10);
        const p2 = parseInt(parts[1].trim(), 10);
        let y = parts[2].trim();
        if (y.length === 2) y = '20' + y;

        if (p2 > 12 && p1 <= 12) {
          return `${y}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
        }
        return `${y}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
      }
    }
  }

  // 6. Format DD.MM.YYYY
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
      if (json && (json.status === 'error' || json.error)) {
        const errMsg = json.message || json.error || 'Google Apps Script merespons dengan status error.';
        return {
          entries: [],
          steamData: {},
          summary: { rowCount: 0, datesFound: [], fuelCounts, totalKonsumsi: 0, totalHarga: 0 },
          errors: [errMsg],
        };
      }
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

  let isDailyMatrixFormat = false;
  const matrixColMap = {
    tanggal: 0,
    totalQty: -1,
    totalHarga: -1,
    steamOut: 3,
    kgPerTonSteam: -1,
    rpPerTonSteam: -1,
    cangkangQty: -1,
    woodPelletQty: -1,
    dustPelletQty: -1,
    kopiPelletQty: -1,
    cangkangHarga: -1,
    woodPelletHarga: -1,
    dustPelletHarga: -1,
    kopiHarga: -1,
  };

  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const cols = splitRow(lines[i]).map((c) => c.toUpperCase());
    const hasPt = cols.some((c) => c.includes('NAMA PT') || c.includes('VENDOR') || c.includes('PT') || c.includes('SUPPLIER'));
    const hasBahan = cols.some((c) => c.includes('BAHAN') || c.includes('FUEL') || c.includes('PELLET') || c.includes('CANGKANG'));
    const hasTgl = cols.some((c) => c.includes('TANGGAL') || c.includes('DATE'));
    const isDailyMatrix = cols.some((c) => 
      c.includes('TOTAL CANGKANG') || 
      c.includes('TOTAL WOOD') || 
      c.includes('TOTAL DUST') ||
      c.includes('STEAM OUT') ||
      c.includes('KG/TON') ||
      c.includes('RP/ TON') ||
      (c.includes('TOTAL QTY') && (c.includes('TOTAL HARGA') || c.includes('STEAM') || c.includes('RP')))
    );

    if (isDailyMatrix) {
      headerRowIndex = i;
      isDailyMatrixFormat = true;
      cols.forEach((col, idx) => {
        if (col.includes('DATE') || col.includes('TANGGAL') || col === 'TGL' || col === 'WAKTU') {
          matrixColMap.tanggal = idx;
        } else if (
          (col.includes('TOTAL QTY') || col.includes('TOTAL KONSUMSI') || col === 'TOTAL KG' || col === 'TOTAL JUMLAH') &&
          !col.includes('HARGA') && !col.includes('RP') && !col.includes('STEAM')
        ) {
          matrixColMap.totalQty = idx;
        } else if (
          (col.includes('TOTAL HARGA') || col.includes('TOTAL RP') || col.includes('TOTAL BIAYA') || col === 'TOTAL HARGA (RP)' || col === 'JUMLAH (RP)') &&
          !col.includes('CANGKANG') && !col.includes('WOOD') && !col.includes('DUST') && !col.includes('KOPI') && !col.includes('STEAM') && !col.includes('TON')
        ) {
          matrixColMap.totalHarga = idx;
        } else if (col.includes('STEAM OUT') || col === 'STEAM' || col.includes('OUTPUT STEAM') || col.includes('PRODUKSI STEAM')) {
          matrixColMap.steamOut = idx;
        } else if (col.includes('KG/TON') || col.includes('KG/TOM') || col.includes('KG / TON') || col.includes('SFC')) {
          matrixColMap.kgPerTonSteam = idx;
        } else if (col.includes('RP/ TON') || col.includes('RP/TON') || col.includes('RP / TON') || col.includes('BIAYA/TON') || col.includes('HARGA/TON')) {
          matrixColMap.rpPerTonSteam = idx;
        } else if ((col.includes('CANGKANG') || col.includes('SAWIT')) && !col.includes('HARGA') && !col.includes('%') && !col.includes('RP')) {
          matrixColMap.cangkangQty = idx;
        } else if (col.includes('WOOD') && !col.includes('HARGA') && !col.includes('%') && !col.includes('RP') && !col.includes('DUST')) {
          matrixColMap.woodPelletQty = idx;
        } else if (col.includes('DUST') && !col.includes('HARGA') && !col.includes('%') && !col.includes('RP')) {
          matrixColMap.dustPelletQty = idx;
        } else if (col.includes('KOPI') && !col.includes('HARGA') && !col.includes('%') && !col.includes('RP')) {
          matrixColMap.kopiPelletQty = idx;
        } else if ((col.includes('HARGA') || col.includes('RP')) && (col.includes('CANGKANG') || col.includes('SAWIT'))) {
          matrixColMap.cangkangHarga = idx;
        } else if ((col.includes('HARGA') || col.includes('RP')) && col.includes('WOOD') && !col.includes('DUST')) {
          matrixColMap.woodPelletHarga = idx;
        } else if ((col.includes('HARGA') || col.includes('RP')) && col.includes('DUST')) {
          matrixColMap.dustPelletHarga = idx;
        } else if ((col.includes('HARGA') || col.includes('RP')) && col.includes('KOPI')) {
          matrixColMap.kopiHarga = idx;
        }
      });
      break;
    } else if (hasPt || (hasBahan && hasTgl)) {
      headerRowIndex = i;
      // Map columns dynamically if headers match
      cols.forEach((col, idx) => {
        if (col.includes('NAMA PT') || col.includes('VENDOR') || col.includes('SUPPLIER')) {
          colMap.namaPt = idx;
        } else if (col.includes('BAHAN BAKAR') || col === 'BAHAN' || col === 'FUEL') {
          colMap.bahanBakar = idx;
        } else if (col.includes('TANGGAL') || col.includes('DATE') || col === 'TGL' || col === 'WAKTU') {
          colMap.tanggal = idx;
        } else if (col.includes('MC') || col.includes('MOISTURE')) {
          colMap.mc = idx;
        } else if (col.includes('CALORI') || col.includes('KALORI')) {
          colMap.calori = idx;
        } else if ((col.includes('KONSUMSI') || col === 'KG' || col.includes('PEMAKAIAN') || col.includes('QTY')) && !col.includes('TOTAL') && !col.includes('HARGA') && !col.includes('TON')) {
          colMap.konsumsi = idx;
        } else if ((col.includes('HARGA') || col.includes('RP') || col.includes('TARIF') || col.includes('PRICE')) && !col.includes('TOTAL') && !col.includes('TON')) {
          colMap.harga = idx;
        } else if ((col.includes('TOTAL HARGA') || col.includes('TOTAL RP') || col.includes('TOTAL BIAYA') || col.includes('JUMLAH (RP)') || col.includes('TOTAL (RP)')) && !col.includes('TANGGAL')) {
          colMap.totalHarga = idx;
        } else if (col.includes('STEAM OUT') || col.includes('STEAM') || col.includes('OUTPUT STEAM')) {
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
    if (rawCols.length < 3) continue;

    if (isDailyMatrixFormat) {
      const rawDate = rawCols[matrixColMap.tanggal] || rawCols[0] || '';
      if (!rawDate || rawDate.toUpperCase().includes('TOTAL')) continue;
      const parsedDate = parseSpreadsheetDate(rawDate, lastValidDate);
      if (!parsedDate) continue;
      lastValidDate = parsedDate;
      datesSet.add(parsedDate);

      // Extract steam & total values directly from the matrix row
      const steamNum = cleanNumber(rawCols[matrixColMap.steamOut >= 0 ? matrixColMap.steamOut : 3]);
      if (steamNum > 0) {
        steamData[parsedDate] = steamNum;
      }

      // Read exact TOTAL HARGA (Rp) if present in matrix column 2 or designated column
      const explicitTotalHarga = matrixColMap.totalHarga >= 0 
        ? cleanNumber(rawCols[matrixColMap.totalHarga]) 
        : (rawCols.length > 2 && !rawCols[2].includes('/') ? cleanNumber(rawCols[2]) : 0);

      // Quantities
      const cQty = matrixColMap.cangkangQty >= 0 ? cleanNumber(rawCols[matrixColMap.cangkangQty]) : 0;
      const wQty = matrixColMap.woodPelletQty >= 0 ? cleanNumber(rawCols[matrixColMap.woodPelletQty]) : 0;
      const dQty = matrixColMap.dustPelletQty >= 0 ? cleanNumber(rawCols[matrixColMap.dustPelletQty]) : 0;
      const kQty = matrixColMap.kopiPelletQty >= 0 ? cleanNumber(rawCols[matrixColMap.kopiPelletQty]) : 0;
      const sumQty = cQty + wQty + dQty + kQty;

      // Fuel-specific prices if available
      let cHrgTotal = matrixColMap.cangkangHarga >= 0 ? cleanNumber(rawCols[matrixColMap.cangkangHarga]) : 0;
      let wHrgTotal = matrixColMap.woodPelletHarga >= 0 ? cleanNumber(rawCols[matrixColMap.woodPelletHarga]) : 0;
      let dHrgTotal = matrixColMap.dustPelletHarga >= 0 ? cleanNumber(rawCols[matrixColMap.dustPelletHarga]) : 0;
      let kHrgTotal = matrixColMap.kopiHarga >= 0 ? cleanNumber(rawCols[matrixColMap.kopiHarga]) : 0;

      // If individual fuel prices are 0 but explicitTotalHarga is present in spreadsheet (e.g. column TOTAL HARGA Rp):
      // Distribute explicitTotalHarga proportionally to each active fuel so the sum matches 1:1 down to the Rupiah!
      if (explicitTotalHarga > 0 && (cHrgTotal + wHrgTotal + dHrgTotal + kHrgTotal === 0) && sumQty > 0) {
        cHrgTotal = cQty > 0 ? Math.round((cQty / sumQty) * explicitTotalHarga) : 0;
        wHrgTotal = wQty > 0 ? Math.round((wQty / sumQty) * explicitTotalHarga) : 0;
        dHrgTotal = dQty > 0 ? Math.round((dQty / sumQty) * explicitTotalHarga) : 0;
        kHrgTotal = explicitTotalHarga - (cHrgTotal + wHrgTotal + dHrgTotal);
        if (kHrgTotal < 0 || kQty === 0) {
          // Adjust to whichever has the highest quantity
          const diff = explicitTotalHarga - (cHrgTotal + wHrgTotal + dHrgTotal + (kQty > 0 ? kHrgTotal : 0));
          if (wQty >= cQty && wQty > 0) wHrgTotal += diff;
          else if (cQty > 0) cHrgTotal += diff;
          kHrgTotal = kQty > 0 ? Math.max(0, kHrgTotal) : 0;
        }
      }

      // Check Cangkang
      if (cQty > 0 || cHrgTotal > 0) {
        const unitHrg = cQty > 0 && cHrgTotal > 0 ? Math.round(cHrgTotal / cQty) : 1710;
        const entryTotal = cHrgTotal > 0 ? cHrgTotal : cQty * unitHrg;
        entries.push({
          id: `matrix-row-${Date.now()}-${rowCounter}`,
          no: rowCounter++,
          namaPt: 'SAMCA',
          bahanBakar: 'CANGKANG',
          tanggal: parsedDate,
          mc: 18.2,
          calori: 4100,
          konsumsi: cQty,
          harga: unitHrg,
          totalHarga: entryTotal,
        });
        fuelCounts['CANGKANG'] = (fuelCounts['CANGKANG'] || 0) + 1;
        totalKonsumsi += cQty;
        totalHarga += entryTotal;
      }

      // Check Wood Pellet
      if (wQty > 0 || wHrgTotal > 0) {
        const unitHrg = wQty > 0 && wHrgTotal > 0 ? Math.round(wHrgTotal / wQty) : 1788;
        const entryTotal = wHrgTotal > 0 ? wHrgTotal : wQty * unitHrg;
        entries.push({
          id: `matrix-row-${Date.now()}-${rowCounter}`,
          no: rowCounter++,
          namaPt: 'WIRABUMI',
          bahanBakar: 'WOOD PELLET',
          tanggal: parsedDate,
          mc: 6.8,
          calori: 4320,
          konsumsi: wQty,
          harga: unitHrg,
          totalHarga: entryTotal,
        });
        fuelCounts['WOOD PELLET'] = (fuelCounts['WOOD PELLET'] || 0) + 1;
        totalKonsumsi += wQty;
        totalHarga += entryTotal;
      }

      // Check Dust Pellet
      if (dQty > 0 || dHrgTotal > 0) {
        const unitHrg = dQty > 0 && dHrgTotal > 0 ? Math.round(dHrgTotal / dQty) : 1950;
        const entryTotal = dHrgTotal > 0 ? dHrgTotal : dQty * unitHrg;
        entries.push({
          id: `matrix-row-${Date.now()}-${rowCounter}`,
          no: rowCounter++,
          namaPt: 'INDOPELLET',
          bahanBakar: 'DUST PELLET',
          tanggal: parsedDate,
          mc: 8.5,
          calori: 4150,
          konsumsi: dQty,
          harga: unitHrg,
          totalHarga: entryTotal,
        });
        fuelCounts['DUST PELLET'] = (fuelCounts['DUST PELLET'] || 0) + 1;
        totalKonsumsi += dQty;
        totalHarga += entryTotal;
      }

      // Check Kopi Pellet
      if (kQty > 0 || kHrgTotal > 0) {
        const unitHrg = kQty > 0 && kHrgTotal > 0 ? Math.round(kHrgTotal / kQty) : 2200;
        const entryTotal = kHrgTotal > 0 ? kHrgTotal : kQty * unitHrg;
        entries.push({
          id: `matrix-row-${Date.now()}-${rowCounter}`,
          no: rowCounter++,
          namaPt: 'MARSHARI',
          bahanBakar: 'KOPI PELLET',
          tanggal: parsedDate,
          mc: 9.3,
          calori: 3950,
          konsumsi: kQty,
          harga: unitHrg,
          totalHarga: entryTotal,
        });
        fuelCounts['KOPI PELLET'] = (fuelCounts['KOPI PELLET'] || 0) + 1;
        totalKonsumsi += kQty;
        totalHarga += entryTotal;
      }

      continue;
    }

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
