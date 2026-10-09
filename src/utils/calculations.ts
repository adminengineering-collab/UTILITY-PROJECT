import { FuelEntry, FuelType, DailyFuelSummary } from '../types/boiler';
import { FUEL_TYPES, DAILY_CONSUMPTION_RECORDS } from '../data/initialData';

export function formatRupiah(value: number, includeDecimals = false): string {
  if (isNaN(value) || value === 0) return includeDecimals ? 'Rp0.00' : 'Rp0';
  if (includeDecimals) {
    const parts = value.toFixed(2).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `Rp${integerPart}.${parts[1]}`;
  }
  const rounded = Math.round(value);
  return `Rp${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function formatCurrencyExcel(value: number, decimals = 2): string {
  if (isNaN(value) || value === 0) return decimals > 0 ? 'Rp0.00' : 'Rp0';
  const parts = value.toFixed(decimals).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decimals > 0 ? `Rp${integerPart}.${parts[1]}` : `Rp${integerPart}`;
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

export function parseDateToIso(dateStr: string): string {
  // If DD/MM/YYYY convert to YYYY-MM-DD
  if (dateStr.includes('/')) {
    const [d, m, y] = dateStr.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return dateStr;
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

  // Group entries by date
  const grouped = new Map<string, FuelEntry[]>();
  for (const entry of entries) {
    const list = grouped.get(entry.tanggal) || [];
    list.push(entry);
    grouped.set(entry.tanggal, list);
  }

  // Ensure all 28 days from preloaded records are included, plus any custom user dates
  const allDatesSet = new Set<string>();
  DAILY_CONSUMPTION_RECORDS.forEach((r) => allDatesSet.add(r.isoDate));
  entries.forEach((e) => allDatesSet.add(e.tanggal));
  const sortedDates = Array.from(allDatesSet).sort();

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
    }

    // If preloaded spreadsheet record is available, synchronize exact figures
    if (rec) {
      totalKonsumsi = rec.totalQty;
      totalHarga = rec.totalHarga;

      // Exact breakdown from spreadsheet
      breakdown['CANGKANG'].konsumsi = rec.cangkangQty;
      breakdown['CANGKANG'].hargaTotal = rec.cangkangHarga;

      const totalWoodDustQty = rec.woodPelletQty + rec.dustPelletQty;
      const woodShare = totalWoodDustQty > 0
        ? Math.round(rec.woodDustHarga * (rec.woodPelletQty / totalWoodDustQty))
        : rec.woodDustHarga;
      const dustShare = rec.woodDustHarga - woodShare;

      breakdown['WOOD PELLET'].konsumsi = rec.woodPelletQty;
      breakdown['WOOD PELLET'].hargaTotal = woodShare;

      breakdown['DUST PELLET'].konsumsi = rec.dustPelletQty;
      breakdown['DUST PELLET'].hargaTotal = dustShare;

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

    const steamOut = rec
      ? rec.steamOut
      : (steamDataMap[date] ?? (totalKonsumsi > 0 ? Math.round(totalKonsumsi / 160) : 0));
    const kgPerTonSteam = rec
      ? rec.kgPerTonSteam
      : (steamOut > 0 ? Math.round(totalKonsumsi / steamOut) : 0);
    const rpPerTonSteam = rec
      ? rec.rpPerTonSteam
      : (steamOut > 0 ? totalHarga / steamOut : 0);

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
