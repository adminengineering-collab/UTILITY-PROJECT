import React, { useState, useMemo } from 'react';
import { DailyFuelSummary, FuelEntry } from '../types/boiler';
import { DAILY_CONSUMPTION_RECORDS, DailyConsumptionRecord } from '../data/initialData';
import { formatNumber, formatCurrencyExcel } from '../utils/calculations';
import { Search, Download, Copy, Check, ArrowUpDown, Table, Calendar, Code2 } from 'lucide-react';

interface SpreadsheetTableProps {
  summaries?: DailyFuelSummary[];
  entries?: FuelEntry[];
  steamDataMap?: Record<string, number>;
  onExportCsv?: () => void;
  onOpenRealtimeSettings?: () => void;
}

export const SpreadsheetTable: React.FC<SpreadsheetTableProps> = ({
  summaries = [],
  onOpenRealtimeSettings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateSortOrder, setDateSortOrder] = useState<'asc' | 'desc'>('asc');
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

  // Compute table rows: merge summaries with preloaded records
  const allRows = useMemo(() => {
    // If summaries has items, map through them; otherwise fallback to DAILY_CONSUMPTION_RECORDS
    if (summaries && summaries.length > 0) {
      return summaries.map((s) => {
        const match = preloadedRecordsMap.get(s.tanggal) || preloadedRecordsMap.get(s.displayTanggal);

        // Prioritize live entries or real breakdown data from spreadsheet sync
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

        const cangkangPct = totalQty > 0 ? Math.round((cangkangQty / totalQty) * 100) : 0;
        const woodPelletPct = totalQty > 0 ? Math.round((woodPelletQty / totalQty) * 100) : 0;
        const dustPelletPct = totalQty > 0 ? Math.round((dustPelletQty / totalQty) * 100) : 0;
        const kopiPelletPct = totalQty > 0 ? Math.round((kopiPelletQty / totalQty) * 100) : 0;

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
        };
      });
    }

    return DAILY_CONSUMPTION_RECORDS.map((r) => {
      const cangkangPct = r.totalQty > 0 ? Math.round((r.cangkangQty / r.totalQty) * 100) : 0;
      const woodPelletPct = r.totalQty > 0 ? Math.round((r.woodPelletQty / r.totalQty) * 100) : 0;
      const dustPelletPct = r.totalQty > 0 ? Math.round((r.dustPelletQty / r.totalQty) * 100) : 0;
      const kopiPelletPct = r.totalQty > 0 ? Math.round((r.kopiPelletQty / r.totalQty) * 100) : 0;

      return {
        tanggal: r.tanggal,
        isoDate: r.isoDate,
        totalQty: r.totalQty,
        totalHarga: r.totalHarga,
        steamOut: r.steamOut,
        kgPerTonSteam: r.kgPerTonSteam,
        rpPerTonSteam: r.rpPerTonSteam,
        cangkangQty: r.cangkangQty,
        woodPelletQty: r.woodPelletQty,
        dustPelletQty: r.dustPelletQty,
        kopiPelletQty: r.kopiPelletQty,
        cangkangHarga: r.cangkangHarga,
        woodPelletHarga: r.woodPelletHarga,
        dustPelletHarga: r.dustPelletHarga,
        woodPelletSpreadsheetHarga: r.woodDustHarga ?? (r.woodPelletHarga + r.dustPelletHarga),
        kopiHarga: r.kopiHarga,
        cangkangPct,
        woodPelletPct,
        dustPelletPct,
        kopiPelletPct,
      };
    });
  }, [summaries, preloadedRecordsMap]);

  // Filter & sort rows
  const filteredRows = useMemo(() => {
    let result = allRows;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((r) => r.tanggal.toLowerCase().includes(q) || r.isoDate.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => {
      if (dateSortOrder === 'asc') {
        return a.isoDate.localeCompare(b.isoDate);
      } else {
        return b.isoDate.localeCompare(a.isoDate);
      }
    });
  }, [allRows, searchTerm, dateSortOrder]);

  // Totals calculations for summary row
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
    };
  }, [filteredRows]);

  // Export CSV matching active column mode
  // Export CSV with all 18 columns matching user's spreadsheet exactly
  const handleExportCsv = () => {
    const headers = [
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
    ];

    const rows = filteredRows.map((r) => [
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
    ]);

    // Summary row
    const totalsRow = [
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
    ];
    rows.push(totalsRow);

    const csvContent = [headers.join(','), ...rows.map((row) => row.map((val) => `"${val}"`).join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DATA_SPREADSHEET_BOILER_18_KOLOM_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy as TSV (Direct paste to Google Sheets / Excel with all 18 columns)
  const handleCopyTsv = () => {
    const headers = [
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
    ];

    const rows = filteredRows.map((r) => [
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
    ]);

    const totalsRow = [
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
    ];
    rows.push(totalsRow);

    const tsvContent = [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header and Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-emerald-50/20 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-start sm:items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0 mt-0.5 sm:mt-0">
              <Table className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Data Spreadsheet Konsumsi &amp; Biaya Boiler
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Sinkron 1:1 Spreadsheet</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Tabel operasional 1:1: <strong className="text-slate-700">TANGGAL</strong> · <strong className="text-slate-700">TOTAL QTY</strong> · <strong className="text-slate-700">TOTAL HARGA</strong> · <strong className="text-slate-700">STEAM OUT</strong> · <strong className="text-slate-700">KG/TON STEAM</strong> · <strong className="text-slate-700">RP/ TON STEAM</strong> · <strong className="text-emerald-700">TOTAL CANGKANG SAWIT</strong> · <strong className="text-amber-700">TOTAL WOOD PELLET</strong> · <strong className="text-sky-700">TOTAL DUST PELLET</strong> · <strong className="text-purple-700">TOTAL KOPI PELLET</strong> &amp; Seterusnya.
              </p>
            </div>
          </div>
        </div>

        {/* Filter and Action Bar */}
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
          <div className="relative min-w-[160px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari tanggal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
            />
          </div>

          {/* Sort order toggle */}
          <button
            onClick={() => setDateSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors"
            title="Urutkan Tanggal"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span>Tanggal: {dateSortOrder === 'asc' ? '↑ Terlama' : '↓ Terbaru'}</span>
          </button>

          {/* Copy Table to Clipboard */}
          <button
            onClick={handleCopyTsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors"
            title="Salin untuk di-paste langsung ke Excel / Google Sheets"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span className={copied ? 'text-emerald-700 font-semibold' : ''}>
              {copied ? 'Tersalin ke Clipboard!' : 'Salin Tabel'}
            </span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 border border-emerald-500/30 rounded-lg transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-900" />
            <span>Ekspor CSV / Excel</span>
          </button>

          {/* Apps Script & Sync Modal trigger */}
          {onOpenRealtimeSettings && (
            <button
              onClick={onOpenRealtimeSettings}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors shadow-xs"
              title="Buka Kode Google Apps Script & Pengaturan Sinkronisasi"
            >
              <Code2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Kode Apps Script</span>
            </button>
          )}
        </div>
      </div>

      {/* Spreadsheet Table with Columns matching screenshot */}
      <div className="overflow-x-auto max-h-[680px] relative">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-100 text-slate-800 shadow-sm border-b border-slate-300">
            <tr className="border-b border-slate-300 text-[11px] font-bold tracking-tight uppercase whitespace-nowrap bg-slate-100">
              <th className="py-2.5 px-3 border-r border-slate-300 text-center bg-slate-100 min-w-[95px]">
                TANGGAL
              </th>
              <th className="py-2.5 px-3 border-r border-slate-300 text-right bg-slate-100 min-w-[95px]">
                TOTAL QTY
              </th>
              <th className="py-2.5 px-3 border-r border-slate-300 text-right bg-emerald-50 text-emerald-950 min-w-[130px] font-black tracking-tight shadow-inner">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="font-extrabold">TOTAL HARGA</span>
                  <span className="px-1.5 py-0.5 text-[9px] bg-emerald-600 text-white rounded font-bold tracking-wider uppercase shadow-2xs">
                    Rp (IDR)
                  </span>
                </div>
              </th>
              <th className="py-2.5 px-3 border-r border-slate-300 text-center bg-slate-100 min-w-[90px]">
                STEAM OUT
              </th>
              <th className="py-2.5 px-3 border-r border-slate-300 text-right bg-slate-100 min-w-[95px]">
                KG/Ton Steam
              </th>
              <th className="py-2.5 px-3 border-r border-slate-300 text-right bg-emerald-50 text-emerald-950 min-w-[125px] font-black tracking-tight shadow-inner">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="font-extrabold">RP/ TON STEAM</span>
                  <span className="px-1.5 py-0.5 text-[9px] bg-emerald-600 text-white rounded font-bold tracking-wider uppercase shadow-2xs">
                    Rp/Ton
                  </span>
                </div>
              </th>
              <th className="py-2.5 px-3 border-r border-slate-300 text-right bg-emerald-50/70 text-emerald-900 min-w-[130px]">
                TOTAL CANGKANG SAWIT
              </th>
              <th className="py-2.5 px-3 border-r border-slate-300 text-right bg-amber-50/70 text-amber-900 min-w-[125px]">
                TOTAL WOOD PELLET
              </th>
              <th className="py-2.5 px-3 border-r border-slate-300 text-right bg-sky-50/70 text-sky-900 min-w-[120px]">
                TOTAL DUST PELLET
              </th>
              <th className="py-2.5 px-3 border-r border-slate-300 text-right bg-purple-50/70 text-purple-900 min-w-[120px]">
                TOTAL KOPI PELLET
              </th>

              {/* KOLOM TOTAL HARGA MATA UANG RUPIAH */}
              <th className="py-2.5 px-3 border-r border-slate-300 text-right bg-emerald-50/90 text-emerald-950 min-w-[160px] font-extrabold">
                TOTAL HARGA CANGKANG SAWIT (Rp)
              </th>
              <th className="py-2.5 px-3 border-r border-slate-300 text-right bg-amber-50/90 text-amber-950 min-w-[160px] font-extrabold">
                TOTAL HARGA WOOD PELLET (Rp)
              </th>
              {priceColumnMode === 'separated' && (
                <th className="py-2.5 px-3 border-r border-slate-300 text-right bg-sky-50/90 text-sky-950 min-w-[160px] font-extrabold">
                  TOTAL HARGA DUST PELLET (Rp)
                </th>
              )}
              <th className="py-2.5 px-3 border-r border-slate-300 text-right bg-purple-50/90 text-purple-950 min-w-[150px] font-extrabold">
                TOTAL HARGA KOPI PELLET (Rp)
              </th>

              {/* KOLOM % PERSENTASE */}
              <th className="py-2.5 px-3 border-r border-slate-300 text-right bg-emerald-100/70 text-emerald-950 min-w-[150px]">
                % TOTAL CANGKANG SAWIT
              </th>
              <th className="py-2.5 px-3 border-r border-slate-300 text-right bg-amber-100/70 text-amber-950 min-w-[140px]">
                % TOTAL WOOD PELLET
              </th>
              <th className="py-2.5 px-3 border-r border-slate-300 text-right bg-sky-100/70 text-sky-950 min-w-[140px]">
                % TOTAL DUST PELLET
              </th>
              <th className="py-2.5 px-3 border-r border-slate-300 text-right bg-purple-100/70 text-purple-950 min-w-[140px]">
                % TOTAL KOPI PELLET
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 font-mono text-[11px] text-slate-800 bg-white">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={priceColumnMode === 'spreadsheet' ? 17 : 18} className="py-12 text-center text-slate-400 font-sans">
                  Tidak ada data spreadsheet yang cocok dengan pencarian.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => {
                const isEven = idx % 2 === 0;
                const isZeroDay = row.totalQty === 0 && row.totalHarga === 0;

                return (
                  <tr
                    key={row.isoDate}
                    className={`hover:bg-amber-50/50 transition-colors ${
                      isZeroDay ? 'bg-slate-50/60 text-slate-400' : isEven ? 'bg-white' : 'bg-slate-50/30'
                    }`}
                  >
                    {/* 1. TANGGAL */}
                    <td className="py-1.5 px-3 border-r border-slate-200 text-center font-medium font-sans">
                      {row.tanggal}
                    </td>

                    {/* 2. TOTAL QTY */}
                    <td className="py-1.5 px-3 border-r border-slate-200 text-right">
                      {row.totalQty > 0 ? formatNumber(row.totalQty) : '0'}
                    </td>

                    {/* 3. TOTAL HARGA */}
                    <td className="py-1.5 px-3 border-r border-slate-200 text-right font-semibold text-slate-900">
                      {formatCurrencyExcel(row.totalHarga, 2)}
                    </td>

                    {/* 4. STEAM OUT */}
                    <td className="py-1.5 px-3 border-r border-slate-200 text-center">
                      {row.steamOut > 0 ? formatNumber(row.steamOut) : '0'}
                    </td>

                    {/* 5. KG/Ton Steam */}
                    <td className="py-1.5 px-3 border-r border-slate-200 text-right">
                      {row.kgPerTonSteam > 0 ? formatNumber(row.kgPerTonSteam) : '0'}
                    </td>

                    {/* 6. Rp/Ton Steam */}
                    <td className="py-1.5 px-3 border-r border-slate-200 text-right font-medium text-slate-800">
                      {formatCurrencyExcel(row.rpPerTonSteam, 2)}
                    </td>

                    {/* 7. TOTAL CANGKANG SAWIT */}
                    <td className="py-1.5 px-3 border-r border-slate-200 text-right bg-emerald-50/20 text-emerald-950">
                      {row.cangkangQty > 0 ? formatNumber(row.cangkangQty) : '0'}
                    </td>

                    {/* 8. TOTAL WOOD PELLET */}
                    <td className="py-1.5 px-3 border-r border-slate-200 text-right bg-amber-50/20 text-amber-950">
                      {row.woodPelletQty > 0 ? formatNumber(row.woodPelletQty) : '0'}
                    </td>

                    {/* 9. TOTAL DUST PELLET */}
                    <td className="py-1.5 px-3 border-r border-slate-200 text-right bg-sky-50/20 text-sky-950">
                      {row.dustPelletQty > 0 ? formatNumber(row.dustPelletQty) : '0'}
                    </td>

                    {/* 10. TOTAL KOPI PELLET */}
                    <td className="py-1.5 px-3 border-r border-slate-200 text-right bg-purple-50/20 text-purple-950">
                      {row.kopiPelletQty > 0 ? formatNumber(row.kopiPelletQty) : '0'}
                    </td>

                    {/* 11. TOTAL HARGA CANGKANG SAWIT */}
                    <td className="py-1.5 px-3 border-r border-slate-200 text-right bg-emerald-50/30 text-emerald-900 font-medium">
                      {formatCurrencyExcel(row.cangkangHarga, 0)}
                    </td>

                    {/* 12. TOTAL HARGA WOOD PELLET (Sesuai Spreadsheet atau Terpisah) */}
                    {priceColumnMode === 'spreadsheet' ? (
                      <td className="py-1.5 px-3 border-r border-slate-200 text-right bg-amber-50/30 text-amber-900 font-medium">
                        {formatCurrencyExcel(row.woodPelletSpreadsheetHarga, 0)}
                      </td>
                    ) : (
                      <>
                        <td className="py-1.5 px-3 border-r border-slate-200 text-right bg-amber-50/30 text-amber-900 font-medium">
                          {formatCurrencyExcel(row.woodPelletHarga, 0)}
                        </td>
                        <td className="py-1.5 px-3 border-r border-slate-200 text-right bg-sky-50/30 text-sky-900 font-medium">
                          {formatCurrencyExcel(row.dustPelletHarga, 0)}
                        </td>
                      </>
                    )}

                    {/* 13/14. TOTAL HARGA KOPI PELLET */}
                    <td className="py-1.5 px-3 border-r border-slate-200 text-right bg-purple-50/30 text-purple-900 font-medium">
                      {formatCurrencyExcel(row.kopiHarga, 0)}
                    </td>

                    {/* 15. % TOTAL CANGKANG SAWIT */}
                    <td className="py-1.5 px-3 border-r border-slate-200 text-right text-emerald-800 font-medium">
                      {row.cangkangPct}%
                    </td>

                    {/* 16. % TOTAL WOOD PELLET */}
                    <td className="py-1.5 px-3 border-r border-slate-200 text-right text-amber-800 font-medium">
                      {row.woodPelletPct}%
                    </td>

                    {/* 17. % TOTAL DUST PELLET */}
                    <td className="py-1.5 px-3 border-r border-slate-200 text-right text-sky-800 font-medium">
                      {row.dustPelletPct}%
                    </td>

                    {/* 18. % TOTAL KOPI PELLET */}
                    <td className="py-1.5 px-3 border-r border-slate-200 text-right text-purple-800 font-medium">
                      {row.kopiPelletPct}%
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Sticky Grand Total Footer */}
          <tfoot className="sticky bottom-0 z-10 bg-slate-100 text-slate-900 font-mono text-[11px] font-bold border-t-2 border-slate-400 shadow-md">
            <tr className="bg-slate-200/90 whitespace-nowrap">
              <td className="py-2.5 px-3 border-r border-slate-300 text-center font-sans tracking-wide">
                TOTAL ({filteredRows.length} HARI)
              </td>
              <td className="py-2.5 px-3 border-r border-slate-300 text-right text-slate-950">
                {formatNumber(totals.totalQty)}
              </td>
              <td className="py-2.5 px-3 border-r border-slate-300 text-right text-emerald-800 font-extrabold">
                {formatCurrencyExcel(totals.totalHarga, 2)}
              </td>
              <td className="py-2.5 px-3 border-r border-slate-300 text-center text-slate-950">
                {formatNumber(totals.totalSteam)}
              </td>
              <td className="py-2.5 px-3 border-r border-slate-300 text-right text-slate-950">
                {formatNumber(totals.avgKgPerTon)}
              </td>
              <td className="py-2.5 px-3 border-r border-slate-300 text-right text-slate-950">
                {formatCurrencyExcel(totals.avgRpPerTon, 2)}
              </td>
              <td className="py-2.5 px-3 border-r border-slate-300 text-right text-emerald-900">
                {formatNumber(totals.totalCangkang)}
              </td>
              <td className="py-2.5 px-3 border-r border-slate-300 text-right text-amber-900">
                {formatNumber(totals.totalWood)}
              </td>
              <td className="py-2.5 px-3 border-r border-slate-300 text-right text-sky-900">
                {formatNumber(totals.totalDust)}
              </td>
              <td className="py-2.5 px-3 border-r border-slate-300 text-right text-purple-900">
                {formatNumber(totals.totalKopi)}
              </td>

              {/* FOOTER TOTAL HARGA */}
              <td className="py-2.5 px-3 border-r border-slate-300 text-right text-emerald-900">
                {formatCurrencyExcel(totals.totalCangkangHarga, 0)}
              </td>
              {priceColumnMode === 'spreadsheet' ? (
                <td className="py-2.5 px-3 border-r border-slate-300 text-right text-amber-900">
                  {formatCurrencyExcel(totals.totalWoodPelletSpreadsheetHarga, 0)}
                </td>
              ) : (
                <>
                  <td className="py-2.5 px-3 border-r border-slate-300 text-right text-amber-900">
                    {formatCurrencyExcel(totals.totalWoodPelletHarga, 0)}
                  </td>
                  <td className="py-2.5 px-3 border-r border-slate-300 text-right text-sky-900">
                    {formatCurrencyExcel(totals.totalDustPelletHarga, 0)}
                  </td>
                </>
              )}
              <td className="py-2.5 px-3 border-r border-slate-300 text-right text-purple-900">
                {formatCurrencyExcel(totals.totalKopiHarga, 0)}
              </td>

              {/* FOOTER % PERSENTASE */}
              <td className="py-2.5 px-3 border-r border-slate-300 text-right text-emerald-900">
                {totals.totalCangkangPct}%
              </td>
              <td className="py-2.5 px-3 border-r border-slate-300 text-right text-amber-900">
                {totals.totalWoodPct}%
              </td>
              <td className="py-2.5 px-3 border-r border-slate-300 text-right text-sky-900">
                {totals.totalDustPct}%
              </td>
              <td className="py-2.5 px-3 border-r border-slate-300 text-right text-purple-900">
                {totals.totalKopiPct}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
