import { FuelEntry, DailyFuelSummary } from '../types/boiler';
import { formatDisplayDate, formatRupiah, formatNumber } from './calculations';

export function exportDetailToCsv(entries: FuelEntry[], steamMap: Record<string, number>, filename = 'Laporan_Detail_Konsumsi_Bahan_Bakar.csv') {
  const headers = [
    'NO',
    'NAMA PT',
    'BAHAN BAKAR',
    'TANGGAL',
    'MC (%)',
    'CALORI (kcal/kg)',
    'KONSUMSI (kg)',
    'HARGA (Rp/kg)',
    'TOTAL HARGA (Rp)',
    'STEAM OUT PER TANGGAL (Ton)',
    'KG/TON STEAM PER TANGGAL',
    'RP/TON STEAM PER TANGGAL'
  ];

  // Group by date to determine daily totals for steam metrics
  const dayTotals: Record<string, { totalKonsumsi: number; totalHarga: number }> = {};
  for (const e of entries) {
    if (!dayTotals[e.tanggal]) {
      dayTotals[e.tanggal] = { totalKonsumsi: 0, totalHarga: 0 };
    }
    dayTotals[e.tanggal].totalKonsumsi += e.konsumsi;
    dayTotals[e.tanggal].totalHarga += e.totalHarga;
  }

  const seenDates = new Set<string>();

  const rows = entries.map((entry, idx) => {
    const isFirstOfDay = !seenDates.has(entry.tanggal);
    if (isFirstOfDay) seenDates.add(entry.tanggal);

    const dayTot = dayTotals[entry.tanggal];
    const steamOut = steamMap[entry.tanggal] || 0;
    const kgPerTonSteam = steamOut > 0 ? (dayTot.totalKonsumsi / steamOut).toFixed(0) : '-';
    const rpPerTonSteam = steamOut > 0 ? (dayTot.totalHarga / steamOut).toFixed(2) : '-';

    return [
      idx + 1,
      `"${entry.namaPt}"`,
      `"${entry.bahanBakar}"`,
      formatDisplayDate(entry.tanggal),
      entry.mc.toFixed(2),
      entry.calori !== null ? entry.calori : '-',
      entry.konsumsi,
      entry.harga,
      entry.totalHarga,
      isFirstOfDay && steamOut > 0 ? steamOut : '',
      isFirstOfDay && steamOut > 0 ? kgPerTonSteam : '',
      isFirstOfDay && steamOut > 0 ? rpPerTonSteam : ''
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  triggerDownload(csvContent, filename, 'text/csv;charset=utf-8;');
}

export function exportDailySummaryToCsv(summaries: DailyFuelSummary[], filename = 'Ringkasan_Harian_Konsumsi_Bahan_Bakar.csv') {
  const headers = [
    'TANGGAL',
    'TOTAL KONSUMSI (KG)',
    'TOTAL HARGA (RP)',
    'CANGKANG KONSUMSI (KG)',
    'CANGKANG HARGA (RP)',
    'WOOD PELLET KONSUMSI (KG)',
    'WOOD PELLET HARGA (RP)',
    'DUST PELLET KONSUMSI (KG)',
    'DUST PELLET HARGA (RP)',
    'KOPI PELLET KONSUMSI (KG)',
    'KOPI PELLET HARGA (RP)',
    'STEAM OUT (TON)',
    'KG/TON STEAM',
    'RP/TON STEAM'
  ];

  const rows = summaries.map(s => {
    return [
      s.displayTanggal,
      s.totalKonsumsi,
      s.totalHarga,
      s.breakdown['CANGKANG'].konsumsi,
      s.breakdown['CANGKANG'].hargaTotal,
      s.breakdown['WOOD PELLET'].konsumsi,
      s.breakdown['WOOD PELLET'].hargaTotal,
      s.breakdown['DUST PELLET'].konsumsi,
      s.breakdown['DUST PELLET'].hargaTotal,
      s.breakdown['KOPI PELLET'].konsumsi,
      s.breakdown['KOPI PELLET'].hargaTotal,
      s.steamOut,
      s.kgPerTonSteam,
      s.rpPerTonSteam.toFixed(2)
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  triggerDownload(csvContent, filename, 'text/csv;charset=utf-8;');
}

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
