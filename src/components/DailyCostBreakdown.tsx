import React, { useState, useMemo } from 'react';
import { DailyFuelSummary } from '../types/boiler';
import { formatNumber, formatCurrencyExcel } from '../utils/calculations';
import { DAILY_CONSUMPTION_RECORDS, DailyConsumptionRecord } from '../data/initialData';
import { Calendar, Search, Download, Copy, Check, Table, ChevronRight } from 'lucide-react';

interface DailyCostBreakdownProps {
  summaries: DailyFuelSummary[];
  onSelectDayForDetail?: (day: DailyFuelSummary) => void;
}

export const DailyCostBreakdown: React.FC<DailyCostBreakdownProps> = ({
  summaries,
  onSelectDayForDetail,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  // Mode kolom: 'separated' (Default 18 Kolom: Total Harga Dust Pellet disertakan) vs 'spreadsheet' (17 Kolom)
  const [priceColumnMode, setPriceColumnMode] = useState<'separated' | 'spreadsheet'>('separated');

  // Map pre-loaded spreadsheet records by date (YYYY-MM-DD and DD/MM/YYYY)
  const preloadedRecordsMap = useMemo(() => {
    const map = new Map<string, DailyConsumptionRecord>();
    DAILY_CONSUMPTION_RECORDS.forEach((r) => {
      map.set(r.isoDate, r);
      map.set(r.tanggal, r);
    });
    return map;
  }, []);

  // Compute row data for each summary, prioritizing LIVE synchronized spreadsheet data 1:1
  const tableRows = useMemo(() => {
    return summaries.map((s) => {
      const match = preloadedRecordsMap.get(s.tanggal) || preloadedRecordsMap.get(s.displayTanggal);

      // Check if we have live entries or real breakdown data from the spreadsheet sync
      const hasLiveEntries = Boolean(s.entries && s.entries.length > 0);
      const hasLiveBreakdown = (
        (s.breakdown['CANGKANG']?.konsumsi || 0) > 0 ||
        (s.breakdown['WOOD PELLET']?.konsumsi || 0) > 0 ||
        (s.breakdown['DUST PELLET']?.konsumsi || 0) > 0 ||
        (s.breakdown['KOPI PELLET']?.konsumsi || 0) > 0 ||
        s.totalKonsumsi > 0 ||
        s.totalHarga > 0
      );
      const useLive = hasLiveEntries || hasLiveBreakdown;

      const cangkangQty = useLive ? (s.breakdown['CANGKANG']?.konsumsi || 0) : (match ? match.cangkangQty : 0);
      const woodPelletQty = useLive ? (s.breakdown['WOOD PELLET']?.konsumsi || 0) : (match ? match.woodPelletQty : 0);
      const dustPelletQty = useLive ? (s.breakdown['DUST PELLET']?.konsumsi || 0) : (match ? match.dustPelletQty : 0);
      const kopiPelletQty = useLive ? (s.breakdown['KOPI PELLET']?.konsumsi || 0) : (match ? match.kopiPelletQty : 0);

      const cangkangHarga = useLive 
        ? (s.breakdown['CANGKANG']?.hargaTotal || 0) 
        : (match ? match.cangkangHarga : (cangkangQty > 0 ? cangkangQty * 1710 : 0));

      const woodPelletHarga = useLive 
        ? (s.breakdown['WOOD PELLET']?.hargaTotal || 0) 
        : (match ? match.woodPelletHarga : (woodPelletQty > 0 ? woodPelletQty * 1788 : 0));

      const dustPelletHarga = useLive 
        ? (s.breakdown['DUST PELLET']?.hargaTotal || 0) 
        : (match ? match.dustPelletHarga : (dustPelletQty > 0 ? dustPelletQty * 1950 : 0));

      const rawWoodDust = match ? match.woodDustHarga : undefined;
      const woodPelletSpreadsheetHarga = (!useLive && rawWoodDust !== undefined && rawWoodDust > 0)
        ? rawWoodDust
        : (woodPelletHarga + dustPelletHarga);

      const kopiHarga = useLive 
        ? (s.breakdown['KOPI PELLET']?.hargaTotal || 0) 
        : (match ? match.kopiHarga : (kopiPelletQty > 0 ? kopiPelletQty * 2200 : 0));

      const totalQty = useLive
        ? (s.totalKonsumsi > 0 ? s.totalKonsumsi : (cangkangQty + woodPelletQty + dustPelletQty + kopiPelletQty))
        : (match ? match.totalQty : (cangkangQty + woodPelletQty + dustPelletQty + kopiPelletQty));

      const calcTotalHarga = cangkangHarga + woodPelletHarga + dustPelletHarga + kopiHarga;
      const totalHarga = useLive
        ? (s.totalHarga > 0 ? s.totalHarga : calcTotalHarga)
        : (match ? match.totalHarga : calcTotalHarga);

      const steamOut = s.steamOut > 0 ? s.steamOut : (match ? match.steamOut : 0);
      const kgPerTonSteam = steamOut > 0 ? Math.round(totalQty / steamOut) : (match ? match.kgPerTonSteam : 0);
      const rpPerTonSteam = steamOut > 0 ? totalHarga / steamOut : (match ? match.rpPerTonSteam : 0);

      // Percentage of total quantity
      const cangkangPct = totalQty > 0 ? Math.round((cangkangQty / totalQty) * 100) : 0;
      const woodPelletPct = totalQty > 0 ? Math.round((woodPelletQty / totalQty) * 100) : 0;
      const dustPelletPct = totalQty > 0 ? Math.round((dustPelletQty / totalQty) * 100) : 0;
      const kopiPelletPct = totalQty > 0 ? Math.round((kopiPelletQty / totalQty) * 100) : 0;
      // Monthly average prices according to columns S, T, U, V in latest spreadsheet
      let avgHargaCK = 0;
      let avgHargaWP = 0;
      let avgHargaDP = 0;
      let avgHargaKP = 0;

      const mKey = s.tanggal.substring(0, 7);
      if (mKey === '2026-10') {
        avgHargaCK = 1679;
        avgHargaWP = 1671;
        avgHargaDP = 1594;
        avgHargaKP = 0;
      } else if (mKey === '2026-09') {
        avgHargaCK = 1700;
        avgHargaWP = 1687;
        avgHargaDP = 1600;
        avgHargaKP = 0;
      } else if (mKey === '2026-08') {
        avgHargaCK = 1726;
        avgHargaWP = 1750;
        avgHargaDP = 1599;
        avgHargaKP = 0;
      } else if (mKey === '2026-02') {
        avgHargaCK = 1709;
        avgHargaWP = 1586;
        avgHargaDP = 0;
        avgHargaKP = 2200;
      }

      return {
        tanggal: s.displayTanggal,
        isoDate: s.tanggal,
        totalQty,
        totalHarga,
        steamOut,
        kgPerTonSteam,
        rpPerTonSteam,
        cangkangQty,
        woodPelletQty,
        dustPelletQty,
        kopiPelletQty,
        cangkangHarga,
        woodPelletHarga,
        dustPelletHarga,
        woodPelletSpreadsheetHarga,
        kopiHarga,
        cangkangPct,
        woodPelletPct,
        dustPelletPct,
        kopiPelletPct,
        avgHargaCK,
        avgHargaWP,
        avgHargaDP,
        avgHargaKP,
        summaryRef: s,
      };
    });
  }, [summaries, preloadedRecordsMap]);

  // Filter rows based on search
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return tableRows;
    const lower = searchTerm.toLowerCase();
    return tableRows.filter((r) => r.tanggal.toLowerCase().includes(lower));
  }, [tableRows, searchTerm]);

  // Totals calculations
  const totals = useMemo(() => {
    let totalQty = 0;
    let totalHarga = 0;
    let totalSteam = 0;
    let totalCangkang = 0;
    let totalWood = 0;
    let totalDust = 0;
    let totalKopi = 0;
    let totalCangkangHarga = 0;
    let totalWoodPelletHarga = 0;
    let totalDustPelletHarga = 0;
    let totalWoodPelletSpreadsheetHarga = 0;
    let totalKopiHarga = 0;

    filteredRows.forEach((r) => {
      totalQty += r.totalQty;
      totalHarga += r.totalHarga;
      totalSteam += r.steamOut;
      totalCangkang += r.cangkangQty;
      totalWood += r.woodPelletQty;
      totalDust += r.dustPelletQty;
      totalKopi += r.kopiPelletQty;
      totalCangkangHarga += r.cangkangHarga;
      totalWoodPelletHarga += r.woodPelletHarga;
      totalDustPelletHarga += r.dustPelletHarga;
      totalWoodPelletSpreadsheetHarga += r.woodPelletSpreadsheetHarga;
      totalKopiHarga += r.kopiHarga;
    });

    const avgKgPerTon = totalSteam > 0 ? Math.round(totalQty / totalSteam) : 0;
    const avgRpPerTon = totalSteam > 0 ? totalHarga / totalSteam : 0;

    const totalCangkangPct = totalQty > 0 ? Math.round((totalCangkang / totalQty) * 100) : 0;
    const totalWoodPct = totalQty > 0 ? Math.round((totalWood / totalQty) * 100) : 0;
    const totalDustPct = totalQty > 0 ? Math.round((totalDust / totalQty) * 100) : 0;
    const totalKopiPct = totalQty > 0 ? Math.round((totalKopi / totalQty) * 100) : 0;

    // Monthly average prices matching spreadsheet columns S, T, U, V
    const avgHargaCK = totalCangkang > 0 ? Math.round(totalCangkangHarga / totalCangkang) : 0;
    const avgHargaWP = totalWood > 0 ? Math.round(totalWoodPelletHarga / totalWood) : 0;
    const avgHargaDP = totalDust > 0 ? Math.round(totalDustPelletHarga / totalDust) : 0;
    const avgHargaKP = totalKopi > 0 ? Math.round(totalKopiHarga / totalKopi) : 0;

    return {
      totalQty,
      totalHarga,
      totalSteam,
      avgKgPerTon,
      avgRpPerTon,
      totalCangkang,
      totalWood,
      totalDust,
      totalKopi,
      totalCangkangHarga,
      totalWoodPelletHarga,
      totalDustPelletHarga,
      totalWoodPelletSpreadsheetHarga,
      totalKopiHarga,
      totalCangkangPct,
      totalWoodPct,
      totalDustPct,
      totalKopiPct,
      avgHargaCK,
      avgHargaWP,
      avgHargaDP,
      avgHargaKP,
    };
  }, [filteredRows]);

  // Export to CSV matching active table column mode
  const handleExportCsv = () => {
    const isSpreadsheetMode = priceColumnMode === 'spreadsheet';
    const headers = isSpreadsheetMode
      ? [
          'TANGGAL',
          'TOTAL QTY',
          'TOTAL HARGA',
          'STEAM OUT',
          'KG/Ton Steam',
          'Rp/Ton Steam',
          'TOTAL CANGKANG SAWIT',
          'TOTAL WOOD PELLET',
          'TOTAL DUST PELLET',
          'TOTAL KOPI PELLET',
          'TOTAL HARGA CANGKANG SAWIT',
          'TOTAL HARGA WOOD PELLET',
          'TOTAL HARGA KOPI PELLET',
          '% TOTAL CANGKANG SAWIT',
          '% TOTAL WOOD PELLET',
          '% TOTAL DUST PELLET',
          '% TOTAL KOPI PELLET',
          'HARGA RATA-RATA CK',
          'HARGA RATA-RATA WP',
          'HARGA RATA-RATA DP',
          'HARGA RATA-RATA KP',
        ]
      : [
          'TANGGAL',
          'TOTAL QTY',
          'TOTAL HARGA',
          'STEAM OUT',
          'KG/Ton Steam',
          'Rp/Ton Steam',
          'TOTAL CANGKANG SAWIT',
          'TOTAL WOOD PELLET',
          'TOTAL DUST PELLET',
          'TOTAL KOPI PELLET',
          'TOTAL HARGA CANGKANG SAWIT',
          'TOTAL HARGA WOOD PELLET',
          'TOTAL HARGA DUST PELLET',
          'TOTAL HARGA KOPI PELLET',
          '% TOTAL CANGKANG SAWIT',
          '% TOTAL WOOD PELLET',
          '% TOTAL DUST PELLET',
          '% TOTAL KOPI PELLET',
          'HARGA RATA-RATA CK',
          'HARGA RATA-RATA WP',
          'HARGA RATA-RATA DP',
          'HARGA RATA-RATA KP',
        ];

    const lines = [headers.join(',')];

    filteredRows.forEach((r) => {
      const rowData = isSpreadsheetMode
        ? [
            r.tanggal,
            r.totalQty,
            r.totalHarga,
            r.steamOut,
            r.kgPerTonSteam,
            r.rpPerTonSteam.toFixed(2),
            r.cangkangQty,
            r.woodPelletQty,
            r.dustPelletQty,
            r.kopiPelletQty,
            r.cangkangHarga,
            r.woodPelletSpreadsheetHarga,
            r.kopiHarga,
            `${r.cangkangPct}%`,
            `${r.woodPelletPct}%`,
            `${r.dustPelletPct}%`,
            `${r.kopiPelletPct}%`,
            r.avgHargaCK,
            r.avgHargaWP,
            r.avgHargaDP,
            r.avgHargaKP,
          ]
        : [
            r.tanggal,
            r.totalQty,
            r.totalHarga,
            r.steamOut,
            r.kgPerTonSteam,
            r.rpPerTonSteam.toFixed(2),
            r.cangkangQty,
            r.woodPelletQty,
            r.dustPelletQty,
            r.kopiPelletQty,
            r.cangkangHarga,
            r.woodPelletHarga,
            r.dustPelletHarga,
            r.kopiHarga,
            `${r.cangkangPct}%`,
            `${r.woodPelletPct}%`,
            `${r.dustPelletPct}%`,
            `${r.kopiPelletPct}%`,
            r.avgHargaCK,
            r.avgHargaWP,
            r.avgHargaDP,
            r.avgHargaKP,
          ];
      lines.push(rowData.join(','));
    });

    // Add totals row
    const totalsData = isSpreadsheetMode
      ? [
          'TOTAL',
          totals.totalQty,
          totals.totalHarga,
          totals.totalSteam,
          totals.avgKgPerTon,
          totals.avgRpPerTon.toFixed(2),
          totals.totalCangkang,
          totals.totalWood,
          totals.totalDust,
          totals.totalKopi,
          totals.totalCangkangHarga,
          totals.totalWoodPelletSpreadsheetHarga,
          totals.totalKopiHarga,
          `${totals.totalCangkangPct}%`,
          `${totals.totalWoodPct}%`,
          `${totals.totalDustPct}%`,
          `${totals.totalKopiPct}%`,
          totals.avgHargaCK,
          totals.avgHargaWP,
          totals.avgHargaDP,
          totals.avgHargaKP,
        ]
      : [
          'TOTAL',
          totals.totalQty,
          totals.totalHarga,
          totals.totalSteam,
          totals.avgKgPerTon,
          totals.avgRpPerTon.toFixed(2),
          totals.totalCangkang,
          totals.totalWood,
          totals.totalDust,
          totals.totalKopi,
          totals.totalCangkangHarga,
          totals.totalWoodPelletHarga,
          totals.totalDustPelletHarga,
          totals.totalKopiHarga,
          `${totals.totalCangkangPct}%`,
          `${totals.totalWoodPct}%`,
          `${totals.totalDustPct}%`,
          `${totals.totalKopiPct}%`,
          totals.avgHargaCK,
          totals.avgHargaWP,
          totals.avgHargaDP,
          totals.avgHargaKP,
        ];
    lines.push(totalsData.join(','));

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-harian-konsumsi-boiler-${priceColumnMode}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy table to clipboard in tab-separated format for direct Excel paste
  const handleCopyTable = () => {
    const isSpreadsheetMode = priceColumnMode === 'spreadsheet';
    const headers = isSpreadsheetMode
      ? [
          'TANGGAL',
          'TOTAL QTY',
          'TOTAL HARGA',
          'STEAM OUT',
          'KG/Ton Steam',
          'Rp/Ton Steam',
          'TOTAL CANGKANG SAWIT',
          'TOTAL WOOD PELLET',
          'TOTAL DUST PELLET',
          'TOTAL KOPI PELLET',
          'TOTAL HARGA CANGKANG SAWIT',
          'TOTAL HARGA WOOD PELLET',
          'TOTAL HARGA KOPI PELLET',
          '% TOTAL CANGKANG SAWIT',
          '% TOTAL WOOD PELLET',
          '% TOTAL DUST PELLET',
          '% TOTAL KOPI PELLET',
          'HARGA RATA-RATA CK',
          'HARGA RATA-RATA WP',
          'HARGA RATA-RATA DP',
          'HARGA RATA-RATA KP',
        ]
      : [
          'TANGGAL',
          'TOTAL QTY',
          'TOTAL HARGA',
          'STEAM OUT',
          'KG/Ton Steam',
          'Rp/Ton Steam',
          'TOTAL CANGKANG SAWIT',
          'TOTAL WOOD PELLET',
          'TOTAL DUST PELLET',
          'TOTAL KOPI PELLET',
          'TOTAL HARGA CANGKANG SAWIT',
          'TOTAL HARGA WOOD PELLET',
          'TOTAL HARGA DUST PELLET',
          'TOTAL HARGA KOPI PELLET',
          '% TOTAL CANGKANG SAWIT',
          '% TOTAL WOOD PELLET',
          '% TOTAL DUST PELLET',
          '% TOTAL KOPI PELLET',
          'HARGA RATA-RATA CK',
          'HARGA RATA-RATA WP',
          'HARGA RATA-RATA DP',
          'HARGA RATA-RATA KP',
        ];

    const lines = [headers.join('\t')];

    filteredRows.forEach((r) => {
      const rowData = isSpreadsheetMode
        ? [
            r.tanggal,
            r.totalQty,
            formatCurrencyExcel(r.totalHarga, 2),
            r.steamOut,
            r.kgPerTonSteam,
            formatCurrencyExcel(r.rpPerTonSteam, 2),
            r.cangkangQty,
            r.woodPelletQty,
            r.dustPelletQty,
            r.kopiPelletQty,
            formatCurrencyExcel(r.cangkangHarga, 0),
            formatCurrencyExcel(r.woodPelletSpreadsheetHarga, 0),
            formatCurrencyExcel(r.kopiHarga, 0),
            `${r.cangkangPct}%`,
            `${r.woodPelletPct}%`,
            `${r.dustPelletPct}%`,
            `${r.kopiPelletPct}%`,
            formatCurrencyExcel(r.avgHargaCK, 0),
            formatCurrencyExcel(r.avgHargaWP, 0),
            formatCurrencyExcel(r.avgHargaDP, 0),
            formatCurrencyExcel(r.avgHargaKP, 0),
          ]
        : [
            r.tanggal,
            r.totalQty,
            formatCurrencyExcel(r.totalHarga, 2),
            r.steamOut,
            r.kgPerTonSteam,
            formatCurrencyExcel(r.rpPerTonSteam, 2),
            r.cangkangQty,
            r.woodPelletQty,
            r.dustPelletQty,
            r.kopiPelletQty,
            formatCurrencyExcel(r.cangkangHarga, 0),
            formatCurrencyExcel(r.woodPelletHarga, 0),
            formatCurrencyExcel(r.dustPelletHarga, 0),
            formatCurrencyExcel(r.kopiHarga, 0),
            `${r.cangkangPct}%`,
            `${r.woodPelletPct}%`,
            `${r.dustPelletPct}%`,
            `${r.kopiPelletPct}%`,
            formatCurrencyExcel(r.avgHargaCK, 0),
            formatCurrencyExcel(r.avgHargaWP, 0),
            formatCurrencyExcel(r.avgHargaDP, 0),
            formatCurrencyExcel(r.avgHargaKP, 0),
          ];
      lines.push(rowData.join('\t'));
    });

    const totalsData = isSpreadsheetMode
      ? [
          'TOTAL',
          totals.totalQty,
          formatCurrencyExcel(totals.totalHarga, 2),
          totals.totalSteam,
          totals.avgKgPerTon,
          formatCurrencyExcel(totals.avgRpPerTon, 2),
          totals.totalCangkang,
          totals.totalWood,
          totals.totalDust,
          totals.totalKopi,
          formatCurrencyExcel(totals.totalCangkangHarga, 0),
          formatCurrencyExcel(totals.totalWoodPelletSpreadsheetHarga, 0),
          formatCurrencyExcel(totals.totalKopiHarga, 0),
          `${totals.totalCangkangPct}%`,
          `${totals.totalWoodPct}%`,
          `${totals.totalDustPct}%`,
          `${totals.totalKopiPct}%`,
          formatCurrencyExcel(totals.avgHargaCK, 0),
          formatCurrencyExcel(totals.avgHargaWP, 0),
          formatCurrencyExcel(totals.avgHargaDP, 0),
          formatCurrencyExcel(totals.avgHargaKP, 0),
        ]
      : [
          'TOTAL',
          totals.totalQty,
          formatCurrencyExcel(totals.totalHarga, 2),
          totals.totalSteam,
          totals.avgKgPerTon,
          formatCurrencyExcel(totals.avgRpPerTon, 2),
          totals.totalCangkang,
          totals.totalWood,
          totals.totalDust,
          totals.totalKopi,
          formatCurrencyExcel(totals.totalCangkangHarga, 0),
          formatCurrencyExcel(totals.totalWoodPelletHarga, 0),
          formatCurrencyExcel(totals.totalDustPelletHarga, 0),
          formatCurrencyExcel(totals.totalKopiHarga, 0),
          `${totals.totalCangkangPct}%`,
          `${totals.totalWoodPct}%`,
          `${totals.totalDustPct}%`,
          `${totals.totalKopiPct}%`,
          formatCurrencyExcel(totals.avgHargaCK, 0),
          formatCurrencyExcel(totals.avgHargaWP, 0),
          formatCurrencyExcel(totals.avgHargaDP, 0),
          formatCurrencyExcel(totals.avgHargaKP, 0),
        ];
    lines.push(totalsData.join('\t'));

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Header and Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-amber-50/30 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 shadow-2xs">
              <Table className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Lembar Data Real-Time Sinkron Spreadsheet
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Sinkron 1:1 Grafik Volume &amp; Spreadsheet</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                  <span>Harga Rata-Rata Terkini: CK Rp1.679 · WP Rp1.671 · DP Rp1.594 · KP Rp0</span>
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  {filteredRows.length} Hari Pengamatan
                </span>
              </div>
              {/* Keterangan disembunyikan per permintaan */}
              <p className="hidden text-xs text-slate-500 mt-1 leading-relaxed">
                Tersinkronisasi 1:1 dengan Grafik Total Konsumsi Volume: <strong className="text-slate-700">TANGGAL</strong> · <strong className="text-slate-700">TOTAL QTY</strong> · <strong className="text-slate-700">TOTAL HARGA</strong> · <strong className="text-slate-700">STEAM OUT</strong> · <strong className="text-slate-700">KG/TON STEAM</strong> · <strong className="text-slate-700">RP/ TON STEAM</strong> · <strong className="text-emerald-700">TOTAL CANGKANG SAWIT</strong> · <strong className="text-amber-700">TOTAL WOOD PELLET</strong> · <strong className="text-sky-700">TOTAL DUST PELLET</strong> · <strong className="text-purple-700">TOTAL KOPI PELLET</strong> &amp; Seterusnya.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Selector Pill: 18 Kolom (+ Dust Pellet) vs 17 Kolom (Gabungan) */}
          <div className="flex items-center bg-slate-200/90 p-0.5 rounded-lg text-xs font-semibold border border-slate-300">
            <button
              type="button"
              onClick={() => setPriceColumnMode('separated')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                priceColumnMode === 'separated'
                  ? 'bg-white text-slate-950 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tampilkan lengkap 18 kolom termasuk TOTAL HARGA DUST PELLET"
            >
              <span>📋 + Total Harga Dust Pellet</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-sky-100 text-sky-800 rounded font-bold">18 Kolom</span>
            </button>
            <button
              type="button"
              onClick={() => setPriceColumnMode('spreadsheet')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                priceColumnMode === 'spreadsheet'
                  ? 'bg-white text-slate-950 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Format 17 Kolom (Gabungan Total Harga Wood & Dust Pellet)"
            >
              <span>📊 Gabungan Wood & Dust</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold">17 Kolom</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative min-w-[150px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari tanggal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
            />
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopyTable}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-2xs"
            title="Salin seluruh tabel ke clipboard untuk ditempel di Microsoft Excel / Google Sheets"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Salin Excel</span>
              </>
            )}
          </button>

          {/* Export CSV button */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-2xs"
            title="Unduh data tabel dalam file CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Table matching image.png exactly */}
      <div className="overflow-x-auto max-h-[720px] relative">
        <table className="w-full text-left text-xs border-collapse">
          {/* Header Row matching image */}
          <thead className="sticky top-0 z-20 bg-slate-100 text-slate-800 shadow-2xs border-b border-slate-300">
            <tr className="divide-x divide-slate-300 text-[11px] font-bold whitespace-nowrap">
              <th className="py-2.5 px-3 text-center bg-slate-200/90 text-slate-900 border-b border-slate-300">
                TANGGAL
              </th>
              <th className="py-2.5 px-3 text-right bg-slate-100 border-b border-slate-300">
                TOTAL QTY
              </th>
              {/* KOLOM TOTAL HARGA (RP) - Focused Element Selector 1 */}
              <th className="py-2.5 px-3 text-right bg-emerald-50 text-emerald-950 border-b border-slate-300 font-black tracking-tight shadow-inner">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="font-extrabold">TOTAL HARGA</span>
                  <span className="px-1.5 py-0.5 text-[9px] bg-emerald-600 text-white rounded font-bold tracking-wider uppercase shadow-2xs">
                    Rp (IDR)
                  </span>
                </div>
              </th>
              <th className="py-2.5 px-3 text-right bg-sky-50 text-sky-950 border-b border-slate-300">
                STEAM OUT
              </th>
              <th className="py-2.5 px-3 text-right bg-slate-100 border-b border-slate-300">
                KG/Ton Steam
              </th>
              {/* KOLOM RP/ TON STEAM - Focused Element Selector 2 */}
              <th className="py-2.5 px-3 text-right bg-emerald-50 text-emerald-950 border-b border-slate-300 font-black tracking-tight shadow-inner">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="font-extrabold">RP/ TON STEAM</span>
                  <span className="px-1.5 py-0.5 text-[9px] bg-emerald-600 text-white rounded font-bold tracking-wider uppercase shadow-2xs">
                    Rp/Ton
                  </span>
                </div>
              </th>
              <th className="py-2.5 px-3 text-right bg-emerald-50 text-emerald-950 border-b border-slate-300">
                TOTAL CANGKANG SAWIT
              </th>
              <th className="py-2.5 px-3 text-right bg-amber-50 text-amber-950 border-b border-slate-300">
                TOTAL WOOD PELLET
              </th>
              <th className="py-2.5 px-3 text-right bg-sky-50 text-sky-950 border-b border-slate-300">
                TOTAL DUST PELLET
              </th>
              <th className="py-2.5 px-3 text-right bg-purple-50 text-purple-950 border-b border-slate-300">
                TOTAL KOPI PELLET
              </th>
              {/* KOLOM TOTAL HARGA MATA UANG RUPIAH */}
              <th className="py-2.5 px-3 text-right bg-emerald-50/90 text-emerald-950 border-b border-slate-300 font-extrabold">
                TOTAL HARGA CANGKANG SAWIT (Rp)
              </th>
              <th className="py-2.5 px-3 text-right bg-amber-50/90 text-amber-950 border-b border-slate-300 font-extrabold">
                TOTAL HARGA WOOD PELLET (Rp)
              </th>
              {priceColumnMode === 'separated' && (
                <th className="py-2.5 px-3 text-right bg-sky-50/90 text-sky-950 border-b border-slate-300 font-extrabold">
                  TOTAL HARGA DUST PELLET (Rp)
                </th>
              )}
              <th className="py-2.5 px-3 text-right bg-purple-50/90 text-purple-950 border-b border-slate-300 font-extrabold">
                TOTAL HARGA KOPI PELLET (Rp)
              </th>

              {/* KOLOM PERSENTASE KOMPOSISI */}
              <th className="py-2.5 px-3 text-right bg-emerald-100/70 text-emerald-950 border-b border-slate-300">
                % TOTAL CANGKANG SAWIT
              </th>
              <th className="py-2.5 px-3 text-right bg-amber-100/70 text-amber-950 border-b border-slate-300">
                % TOTAL WOOD PELLET
              </th>
              <th className="py-2.5 px-3 text-right bg-sky-100/70 text-sky-950 border-b border-slate-300">
                % TOTAL DUST PELLET
              </th>
              <th className="py-2.5 px-3 text-right bg-purple-100/70 text-purple-950 border-b border-slate-300">
                % TOTAL KOPI PELLET
              </th>

              {/* KOLOM HARGA RATA-RATA VENDOR (KOLOM S, T, U, V SPREADSHEET TERBARU) */}
              <th className="py-2.5 px-3 text-right bg-amber-50/90 text-amber-950 border-b border-slate-300 font-extrabold whitespace-nowrap">
                HARGA RATA-RATA CK (Rp)
              </th>
              <th className="py-2.5 px-3 text-right bg-amber-50/90 text-amber-950 border-b border-slate-300 font-extrabold whitespace-nowrap">
                HARGA RATA-RATA WP (Rp)
              </th>
              <th className="py-2.5 px-3 text-right bg-amber-50/90 text-amber-950 border-b border-slate-300 font-extrabold whitespace-nowrap">
                HARGA RATA-RATA DP (Rp)
              </th>
              <th className="py-2.5 px-3 text-right bg-amber-50/90 text-amber-950 border-b border-slate-300 font-extrabold whitespace-nowrap">
                HARGA RATA-RATA KP (Rp)
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-200 bg-white font-mono text-[11px] text-slate-800">
            {filteredRows.length > 0 ? (
              filteredRows.map((row, idx) => {
                const isZero = row.totalQty === 0;

                return (
                  <tr
                    key={row.isoDate}
                    onClick={() => onSelectDayForDetail && onSelectDayForDetail(row.summaryRef)}
                    className={`divide-x divide-slate-200 transition-colors ${
                      isZero
                        ? 'bg-slate-50 text-slate-400'
                        : idx % 2 === 0
                        ? 'bg-white hover:bg-amber-50/40'
                        : 'bg-slate-50/50 hover:bg-amber-50/40'
                    } ${onSelectDayForDetail ? 'cursor-pointer' : ''}`}
                  >
                    {/* 1. TANGGAL */}
                    <td className="py-2 px-3 text-center font-bold text-slate-900 whitespace-nowrap">
                      {row.tanggal}
                    </td>

                    {/* 2. TOTAL QTY */}
                    <td className="py-2 px-3 text-right font-extrabold text-slate-900 tabular-nums">
                      {row.totalQty > 0 ? formatNumber(row.totalQty) : '0'}
                    </td>

                    {/* 3. TOTAL HARGA */}
                    <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums">
                      {formatCurrencyExcel(row.totalHarga, 2)}
                    </td>

                    {/* 4. STEAM OUT */}
                    <td className="py-2 px-3 text-right font-bold text-sky-800 tabular-nums">
                      {row.steamOut > 0 ? formatNumber(row.steamOut) : '0'}
                    </td>

                    {/* 5. KG/Ton Steam */}
                    <td className="py-2 px-3 text-right text-slate-800 tabular-nums">
                      {row.kgPerTonSteam > 0 ? formatNumber(row.kgPerTonSteam) : '0'}
                    </td>

                    {/* 6. Rp/Ton Steam */}
                    <td className="py-2 px-3 text-right text-slate-800 tabular-nums">
                      {formatCurrencyExcel(row.rpPerTonSteam, 2)}
                    </td>

                    {/* 7. TOTAL CANGKANG SAWIT */}
                    <td className="py-2 px-3 text-right text-emerald-800 font-semibold tabular-nums">
                      {row.cangkangQty > 0 ? formatNumber(row.cangkangQty) : '0'}
                    </td>

                    {/* 8. TOTAL WOOD PELLET */}
                    <td className="py-2 px-3 text-right text-amber-800 font-semibold tabular-nums">
                      {row.woodPelletQty > 0 ? formatNumber(row.woodPelletQty) : '0'}
                    </td>

                    {/* 9. TOTAL DUST PELLET */}
                    <td className="py-2 px-3 text-right text-sky-800 font-semibold tabular-nums">
                      {row.dustPelletQty > 0 ? formatNumber(row.dustPelletQty) : '0'}
                    </td>

                    {/* 10. TOTAL KOPI PELLET */}
                    <td className="py-2 px-3 text-right text-purple-800 font-semibold tabular-nums">
                      {row.kopiPelletQty > 0 ? formatNumber(row.kopiPelletQty) : '0'}
                    </td>

                    {/* 11. TOTAL HARGA CANGKANG SAWIT */}
                    <td className="py-2 px-3 text-right text-emerald-900 tabular-nums font-semibold">
                      {formatCurrencyExcel(row.cangkangHarga, 0)}
                    </td>

                    {/* 12. TOTAL HARGA WOOD PELLET (Sesuai Spreadsheet atau Terpisah) */}
                    {priceColumnMode === 'spreadsheet' ? (
                      <td className="py-2 px-3 text-right text-amber-900 tabular-nums font-semibold">
                        {formatCurrencyExcel(row.woodPelletSpreadsheetHarga, 0)}
                      </td>
                    ) : (
                      <>
                        <td className="py-2 px-3 text-right text-amber-900 tabular-nums font-semibold">
                          {formatCurrencyExcel(row.woodPelletHarga, 0)}
                        </td>
                        <td className="py-2 px-3 text-right text-sky-900 tabular-nums font-semibold">
                          {formatCurrencyExcel(row.dustPelletHarga, 0)}
                        </td>
                      </>
                    )}

                    {/* 13/14. TOTAL HARGA KOPI PELLET */}
                    <td className="py-2 px-3 text-right text-purple-900 tabular-nums font-semibold">
                      {formatCurrencyExcel(row.kopiHarga, 0)}
                    </td>

                    {/* % TOTAL CANGKANG SAWIT */}
                    <td className="py-2 px-3 text-right text-emerald-800 font-medium tabular-nums">
                      {row.cangkangPct}%
                    </td>

                    {/* % TOTAL WOOD PELLET */}
                    <td className="py-2 px-3 text-right text-amber-800 font-medium tabular-nums">
                      {row.woodPelletPct}%
                    </td>

                    {/* % TOTAL DUST PELLET */}
                    <td className="py-2 px-3 text-right text-sky-800 font-medium tabular-nums">
                      {row.dustPelletPct}%
                    </td>

                    {/* % TOTAL KOPI PELLET */}
                    <td className="py-2 px-3 text-right text-purple-800 font-medium tabular-nums">
                      {row.kopiPelletPct}%
                    </td>

                    {/* HARGA RATA-RATA CK */}
                    <td className="py-2 px-3 text-right text-emerald-900 font-semibold tabular-nums">
                      {row.avgHargaCK > 0 ? formatCurrencyExcel(row.avgHargaCK, 0) : 'Rp0'}
                    </td>
                    {/* HARGA RATA-RATA WP */}
                    <td className="py-2 px-3 text-right text-amber-900 font-semibold tabular-nums">
                      {row.avgHargaWP > 0 ? formatCurrencyExcel(row.avgHargaWP, 0) : 'Rp0'}
                    </td>
                    {/* HARGA RATA-RATA DP */}
                    <td className="py-2 px-3 text-right text-sky-900 font-semibold tabular-nums">
                      {row.avgHargaDP > 0 ? formatCurrencyExcel(row.avgHargaDP, 0) : 'Rp0'}
                    </td>
                    {/* HARGA RATA-RATA KP */}
                    <td className="py-2 px-3 text-right text-purple-900 font-semibold tabular-nums">
                      {row.avgHargaKP > 0 ? formatCurrencyExcel(row.avgHargaKP, 0) : 'Rp0'}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={priceColumnMode === 'spreadsheet' ? 21 : 22} className="py-8 text-center text-slate-400 font-sans italic">
                  Tidak ada data untuk filter yang dipilih
                </td>
              </tr>
            )}
          </tbody>

          {/* Table Summary Footer matching Excel summary */}
          <tfoot className="sticky bottom-0 z-10 bg-slate-100 text-slate-900 border-t-2 border-slate-300 font-mono text-[11px] font-bold">
            <tr className="divide-x divide-slate-300 bg-slate-200/90 whitespace-nowrap">
              <td className="py-3 px-3 text-center font-extrabold text-slate-950 uppercase tracking-tight">
                TOTAL
              </td>
              <td className="py-3 px-3 text-right font-extrabold text-slate-950">
                {formatNumber(totals.totalQty)}
              </td>
              <td className="py-3 px-3 text-right font-extrabold text-slate-950">
                {formatCurrencyExcel(totals.totalHarga, 2)}
              </td>
              <td className="py-3 px-3 text-right font-extrabold text-sky-900">
                {formatNumber(totals.totalSteam)}
              </td>
              <td className="py-3 px-3 text-right font-bold text-slate-800" title="Rata-rata tertimbang kg/Ton Steam">
                {totals.avgKgPerTon}
              </td>
              <td className="py-3 px-3 text-right font-bold text-slate-800" title="Rata-rata tertimbang Rp/Ton Steam">
                {formatCurrencyExcel(totals.avgRpPerTon, 2)}
              </td>
              <td className="py-3 px-3 text-right font-bold text-emerald-900">
                {formatNumber(totals.totalCangkang)}
              </td>
              <td className="py-3 px-3 text-right font-bold text-amber-900">
                {formatNumber(totals.totalWood)}
              </td>
              <td className="py-3 px-3 text-right font-bold text-sky-900">
                {formatNumber(totals.totalDust)}
              </td>
              <td className="py-3 px-3 text-right font-bold text-purple-900">
                {formatNumber(totals.totalKopi)}
              </td>

              {/* FOOTER TOTAL HARGA */}
              <td className="py-3 px-3 text-right font-bold text-emerald-950">
                {formatCurrencyExcel(totals.totalCangkangHarga, 0)}
              </td>
              {priceColumnMode === 'spreadsheet' ? (
                <td className="py-3 px-3 text-right font-bold text-amber-950">
                  {formatCurrencyExcel(totals.totalWoodPelletSpreadsheetHarga, 0)}
                </td>
              ) : (
                <>
                  <td className="py-3 px-3 text-right font-bold text-amber-950">
                    {formatCurrencyExcel(totals.totalWoodPelletHarga, 0)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-sky-950">
                    {formatCurrencyExcel(totals.totalDustPelletHarga, 0)}
                  </td>
                </>
              )}
              <td className="py-3 px-3 text-right font-bold text-purple-950">
                {formatCurrencyExcel(totals.totalKopiHarga, 0)}
              </td>

              {/* FOOTER % */}
              <td className="py-3 px-3 text-right font-bold text-emerald-950">
                {totals.totalCangkangPct}%
              </td>
              <td className="py-3 px-3 text-right font-bold text-amber-950">
                {totals.totalWoodPct}%
              </td>
              <td className="py-3 px-3 text-right font-bold text-sky-950">
                {totals.totalDustPct}%
              </td>
              <td className="py-3 px-3 text-right font-bold text-purple-950">
                {totals.totalKopiPct}%
              </td>

              {/* FOOTER HARGA RATA-RATA VENDOR */}
              <td className="py-3 px-3 text-right font-bold text-emerald-950">
                {formatCurrencyExcel(totals.avgHargaCK, 0)}
              </td>
              <td className="py-3 px-3 text-right font-bold text-amber-950">
                {formatCurrencyExcel(totals.avgHargaWP, 0)}
              </td>
              <td className="py-3 px-3 text-right font-bold text-sky-950">
                {formatCurrencyExcel(totals.avgHargaDP, 0)}
              </td>
              <td className="py-3 px-3 text-right font-bold text-purple-950">
                {formatCurrencyExcel(totals.avgHargaKP, 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer Info Strip */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <span className="font-mono">
          Menampilkan <strong>{filteredRows.length} hari</strong> pengamatan konsumsi boiler.
        </span>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
            <span>Cangkang Sawit</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block"></span>
            <span>Wood Pellet</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block"></span>
            <span>Dust Pellet</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block"></span>
            <span>Kopi Pellet</span>
          </span>
        </div>
      </div>
    </div>
  );
};
