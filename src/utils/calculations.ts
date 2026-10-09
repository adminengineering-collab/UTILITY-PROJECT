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
  if (!dateStr) return '';
  let s = dateStr.trim();
  if (s.includes('T')) s = s.split('T')[0].trim();
  if (s.includes(' ')) s = s.split(' ')[0].trim();

  // If DD/MM/YYYY or D/M/YYYY
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      let y = parts[2];
      if (y.length === 2) y = '20' + y;
      return `${y}-${m}-${d}`;
    }
  }

  // If YYYY-MM-DD or DD-MM-YYYY
  if (s.includes('-')) {
    const parts = s.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        const d = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        let y = parts[2];
        if (y.length === 2) y = '20' + y;
        return `${y}-${m}-${d}`;
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
