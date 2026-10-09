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

        const totalQty = match ? match.totalQty : s.totalKonsumsi;
        const totalHarga = match ? match.totalHarga : s.totalHarga;
        const steamOut = match ? match.steamOut : s.steamOut;
        const kgPerTonSteam = match ? match.kgPerTonSteam : (steamOut > 0 ? Math.round(totalQty / steamOut) : 0);
        const rpPerTonSteam = match ? match.rpPerTonSteam : (steamOut > 0 ? totalHarga / steamOut : 0);

        const cangkangQty = match ? match.cangkangQty : (s.breakdown['CANGKANG']?.konsumsi || 0);
        const woodPelletQty = match ? match.woodPelletQty : (s.breakdown['WOOD PELLET']?.konsumsi || 0);
        const dustPelletQty = match ? match.dustPelletQty : (s.breakdown['DUST PELLET']?.konsumsi || 0);
        const kopiPelletQty = match ? match.kopiPelletQty : (s.breakdown['KOPI PELLET']?.konsumsi || 0);

        const cangkangHarga = match ? match.cangkangHarga : (s.breakdown['CANGKANG']?.hargaTotal || 0);
        const woodDustHarga = match ? match.woodDustHarga : ((s.breakdown['WOOD PELLET']?.hargaTotal || 0) + (s.breakdown['DUST PELLET']?.hargaTotal || 0));
        const kopiHarga = match ? match.kopiHarga : (s.breakdown['KOPI PELLET']?.hargaTotal || 0);

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
          woodDustHarga,
          kopiHarga,
        };
      });
    }

    return DAILY_CONSUMPTION_RECORDS.map((r) => ({
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
      woodDustHarga: r.woodDustHarga,
      kopiHarga: r.kopiHarga,
    }));
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
    let totalWoodDustHarga = 0;
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
      totalWoodDustHarga += r.woodDustHarga;
      totalKopiHarga += r.kopiHarga;
    });

    const avgKgPerTon = totalSteam > 0 ? Math.round(totalQty / totalSteam) : 0;
    const avgRpPerTon = totalSteam > 0 ? totalHarga / totalSteam : 0;

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
      totalWoodDustHarga,
      totalKopiHarga,
    };
  }, [filteredRows]);

  // Export CSV exactly matching the 13-column spreadsheet
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
      'TOTAL HARGA WOOD PELLET & DUST PELLET',
      'TOTAL HARGA KOPI PELLET',
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
      formatCurrencyExcel(r.woodDustHarga, 0),
      formatCurrencyExcel(r.kopiHarga, 0),
    ]);

    // Summary row
    rows.push([
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
      formatCurrencyExcel(totals.totalWoodDustHarga, 0),
      formatCurrencyExcel(totals.totalKopiHarga, 0),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.map((val) => `"${val}"`).join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DATA_SPREADSHEET_BOILER_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy as TSV (Direct paste to Google Sheets / Excel)
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
      'TOTAL HARGA WOOD PELLET & DUST PELLET',
      'TOTAL HARGA KOPI PELLET',
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
      formatCurrencyExcel(r.woodDustHarga, 0),
      formatCurrencyExcel(r.kopiHarga, 0),
    ]);

    const tsvContent = [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header and Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <Table className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Data Spreadsheet Konsumsi & Biaya Boiler
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Format tabel spreadsheet operasional harian: kuantitas, harga, efisiensi steam, serta rincian per bahan bakar.
          </p>
        </div>

        {/* Filter and Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative min-w-[180px]">
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

      {/* Spreadsheet Table with 13 Columns matching screenshot */}
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
              <th className="py-2.5 px-3 border-r border-slate-300 text-right bg-slate-100 min-w-[125px]">
                TOTAL HARGA
              </th>
              <th className="py-2.5 px-3 border-r border-slate-300 text-center bg-slate-100 min-w-[90px]">
                STEAM OUT
              </th>
              <th className="py-2.5 px-3 border-r border-slate-300 text-right bg-slate-100 min-w-[95px]">
                KG/Ton Steam
              </th>
              <th className="py-2.5 px-3 border-r border-slate-300 text-right bg-slate-100 min-w-[115px]">
                Rp/Ton Steam
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
              <th className="py-2.5 px-3 border-r border-slate-300 text-right bg-emerald-50/90 text-emerald-950 min-w-[160px]">
                TOTAL HARGA CANGKANG SAWIT
              </th>
              <th className="py-2.5 px-3 border-r border-slate-300 text-right bg-amber-50/90 text-amber-950 min-w-[185px]">
                TOTAL HARGA WOOD PELLET & DUST PELLET
              </th>
              <th className="py-2.5 px-3 border-r border-slate-300 text-right bg-purple-50/90 text-purple-950 min-w-[150px]">
                TOTAL HARGA KOPI PELLET
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 font-mono text-[11px] text-slate-800 bg-white">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-12 text-center text-slate-400 font-sans">
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
                      {row.rpPerTonSteam > 0 ? formatCurrencyExcel(row.rpPerTonSteam, 2) : 'Rp0'}
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

                    {/* 12. TOTAL HARGA WOOD PELLET & DUST PELLET */}
                    <td className="py-1.5 px-3 border-r border-slate-200 text-right bg-amber-50/30 text-amber-900 font-medium">
                      {formatCurrencyExcel(row.woodDustHarga, 0)}
                    </td>

                    {/* 13. TOTAL HARGA KOPI PELLET */}
                    <td className="py-1.5 px-3 border-r border-slate-200 text-right bg-purple-50/30 text-purple-900 font-medium">
                      {formatCurrencyExcel(row.kopiHarga, 0)}
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
              <td className="py-2.5 px-3 border-r border-slate-300 text-right text-emerald-900">
                {formatCurrencyExcel(totals.totalCangkangHarga, 0)}
              </td>
              <td className="py-2.5 px-3 border-r border-slate-300 text-right text-amber-900">
                {formatCurrencyExcel(totals.totalWoodDustHarga, 0)}
              </td>
              <td className="py-2.5 px-3 border-r border-slate-300 text-right text-purple-900">
                {formatCurrencyExcel(totals.totalKopiHarga, 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
