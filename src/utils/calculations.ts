import { FuelEntry, FuelType, DailyFuelSummary } from '../types/boiler';
import { FUEL_TYPES, DAILY_CONSUMPTION_RECORDS } from '../data/initialData';

export function formatRupiah(value: number, includeDecimals = false): string {
  if (isNaN(value) || value === 0) return includeDecimals ? 'Rp 0,00' : 'Rp 0';
  if (includeDecimals) {
    const parts = value.toFixed(2).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `Rp ${integerPart},${parts[1]}`;
  }
  const rounded = Math.round(value);
  return `Rp ${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

export function formatCurrencyExcel(value: number, decimals = 2): string {
  if (isNaN(value) || value === 0) return decimals > 0 ? 'Rp 0,00' : 'Rp 0';
  const parts = value.toFixed(decimals).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimals > 0 ? `Rp ${integerPart},${parts[1]}` : `Rp ${integerPart}`;
}

export function formatNumber(value: number, decimals = 0): string {
  if (isNaN(value)) return '0';
  if (decimals > 0) {
    const parts = value.toFixed(decimals).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${integerPart},${parts[1]}`;
  }
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatDisplayDate(dateStr: string): string {
  // Converts YYYY-MM-DD to DD/MM/YYYY
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

const INDO_MONTHS: Record<string, string> = {
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

export function parseDateToIso(dateStr: string): string {
  if (!dateStr) return '';
  let s = dateStr.trim();
  if (s.includes('T')) s = s.split('T')[0].trim();
  if (s.includes(' ') && !s.match(/[a-zA-Z]/)) s = s.split(' ')[0].trim();

  // If already standard ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }

  // Check text format with month names like "1 Agustus 2026", "30 September 2026", "01-Agu-2026"
  const textParts = s.toLowerCase().split(/[\s,.-]+/);
  if (textParts.length >= 3) {
    let day = '';
    let month = '';
    let year = '';

    for (const part of textParts) {
      if (INDO_MONTHS[part]) {
        month = INDO_MONTHS[part];
      } else if (/^\d{4}$/.test(part)) {
        year = part;
      } else if (/^\d{1,2}$/.test(part)) {
        if (!day) day = part.padStart(2, '0');
        else if (!year) year = '20' + part.padStart(2, '0');
      }
    }

    if (day && month && year) {
      return `${year}-${month}-${day}`;
    }
  }

  // If DD/MM/YYYY or MM/DD/YYYY or D/M/YYYY
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

      // Standard Indonesian DD/MM/YYYY (e.g. 01/08/2026 or 30/09/2026)
      return `${y}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    }
  }

  // If YYYY-MM-DD or DD-MM-YYYY
  if (s.includes('-')) {
    const parts = s.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
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
  return s;
}

export function calculateDailySummaries(
  entries: FuelEntry[],
  steamDataMap: Record<string, number>
): DailyFuelSummary[] {
  // Map pre-loaded records by both isoDate (YYYY-MM-DD) and display format (DD/MM/YYYY)
  const preloadedMap = new Map<string, (typeof DAILY_CONSUMPTION_RECORDS)[0]>();
  DAILY_CONSUMPTION_RECORDS.forEach((r) => {
    preloadedMap.set(r.isoDate, r);
    preloadedMap.set(r.tanggal, r);
  });

  // Group entries by normalized ISO date
  const grouped = new Map<string, FuelEntry[]>();
  for (const entry of entries) {
    const isoDate = parseDateToIso(entry.tanggal);
    if (!isoDate) continue;
    const list = grouped.get(isoDate) || [];
    list.push(entry);
    grouped.set(isoDate, list);
  }

  // ONLY include the dates present in the active entries so filtering works accurately
  const sortedDates = Array.from(grouped.keys()).sort();

  return sortedDates.map((date) => {
    const dayEntries = grouped.get(date) || [];
    const rec = preloadedMap.get(date);

    let totalKonsumsi = 0;
    let totalHarga = 0;

    const breakdown: DailyFuelSummary['breakdown'] = {
      'CANGKANG': { konsumsi: 0, hargaTotal: 0, avgHarga: 0, avgMc: 0, entryCount: 0 },
      'WOOD PELLET': { konsumsi: 0, hargaTotal: 0, avgHarga: 0, avgMc: 0, entryCount: 0 },
      'DUST PELLET': { konsumsi: 0, hargaTotal: 0, avgHarga: 0, avgMc: 0, entryCount: 0 },
      'KOPI PELLET': { konsumsi: 0, hargaTotal: 0, avgHarga: 0, avgMc: 0, entryCount: 0 },
    };

    const mcSums: Record<FuelType, { sumMcWeight: number; sumWeight: number }> = {
      'CANGKANG': { sumMcWeight: 0, sumWeight: 0 },
      'WOOD PELLET': { sumMcWeight: 0, sumWeight: 0 },
      'DUST PELLET': { sumMcWeight: 0, sumWeight: 0 },
      'KOPI PELLET': { sumMcWeight: 0, sumWeight: 0 },
    };

    if (dayEntries.length > 0) {
      for (const item of dayEntries) {
        totalKonsumsi += item.konsumsi;
        totalHarga += item.totalHarga;

        const fType = item.bahanBakar;
        if (breakdown[fType]) {
          breakdown[fType].konsumsi += item.konsumsi;
          breakdown[fType].hargaTotal += item.totalHarga;
          breakdown[fType].entryCount += 1;

          mcSums[fType].sumMcWeight += (item.mc || 0) * item.konsumsi;
          mcSums[fType].sumWeight += item.konsumsi;
        }
      }
    } else if (rec) {
      // Fallback to preloaded record only if no entries exist
      totalKonsumsi = rec.totalQty;
      totalHarga = rec.totalHarga;

      breakdown['CANGKANG'].konsumsi = rec.cangkangQty;
      breakdown['CANGKANG'].hargaTotal = rec.cangkangHarga;

      breakdown['WOOD PELLET'].konsumsi = rec.woodPelletQty;
      breakdown['WOOD PELLET'].hargaTotal = rec.woodPelletHarga;

      breakdown['DUST PELLET'].konsumsi = rec.dustPelletQty;
      breakdown['DUST PELLET'].hargaTotal = rec.dustPelletHarga;

      breakdown['KOPI PELLET'].konsumsi = rec.kopiPelletQty;
      breakdown['KOPI PELLET'].hargaTotal = rec.kopiHarga;
    }

    // Compute weighted averages
    for (const f of FUEL_TYPES) {
      if (breakdown[f].konsumsi > 0) {
        breakdown[f].avgHarga = breakdown[f].hargaTotal / breakdown[f].konsumsi;
      }
      if (mcSums[f].sumWeight > 0) {
        breakdown[f].avgMc = mcSums[f].sumMcWeight / mcSums[f].sumWeight;
      }
    }

    const steamOut = steamDataMap[date] ?? (rec ? rec.steamOut : (totalKonsumsi > 0 ? Math.round(totalKonsumsi / 160) : 0));
    const kgPerTonSteam = steamOut > 0 ? Math.round(totalKonsumsi / steamOut) : (rec ? rec.kgPerTonSteam : 0);
    const rpPerTonSteam = steamOut > 0 ? totalHarga / steamOut : (rec ? rec.rpPerTonSteam : 0);

    return {
      tanggal: date,
      displayTanggal: formatDisplayDate(date),
      totalKonsumsi,
      totalHarga,
      steamOut,
      kgPerTonSteam,
      rpPerTonSteam,
      breakdown,
      entries: dayEntries,
    };
  });
}
