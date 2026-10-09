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

  // Map pre-loaded spreadsheet records by date (YYYY-MM-DD and DD/MM/YYYY)
  const preloadedRecordsMap = useMemo(() => {
    const map = new Map<string, DailyConsumptionRecord>();
    DAILY_CONSUMPTION_RECORDS.forEach((r) => {
      map.set(r.isoDate, r);
      map.set(r.tanggal, r);
    });
    return map;
  }, []);

  // Compute row data for each summary, preferring exact preloaded record if available or computing dynamically
  const tableRows = useMemo(() => {
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

  // Export to CSV matching the exact table columns
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

    const lines = [headers.join(',')];

    filteredRows.forEach((r) => {
      lines.push([
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
        r.woodDustHarga,
        r.kopiHarga,
      ].join(','));
    });

    // Add totals row
    lines.push([
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
      totals.totalWoodDustHarga,
      totals.totalKopiHarga,
    ].join(','));

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-harian-konsumsi-boiler-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy table to clipboard in tab-separated format for direct Excel paste
  const handleCopyTable = () => {
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

    const lines = [headers.join('\t')];

    filteredRows.forEach((r) => {
      lines.push([
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
      ].join('\t'));
    });

    lines.push([
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
    ].join('\t'));

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Header and Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center">
              <Table className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Data Harian Konsumsi Bahan Bakar & Steam Boiler
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Format tabel identik dengan spreadsheet monitoring operasional boiler (Total QTY, Biaya, Steam Out, Rasio Efisiensi, & Rincian per Jenis).
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
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
              <th className="py-2.5 px-3 text-right bg-slate-100 border-b border-slate-300">
                TOTAL HARGA
              </th>
              <th className="py-2.5 px-3 text-right bg-sky-50 text-sky-950 border-b border-slate-300">
                STEAM OUT
              </th>
              <th className="py-2.5 px-3 text-right bg-slate-100 border-b border-slate-300">
                KG/Ton Steam
              </th>
              <th className="py-2.5 px-3 text-right bg-slate-100 border-b border-slate-300">
                Rp/Ton Steam
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
              <th className="py-2.5 px-3 text-right bg-slate-100 border-b border-slate-300">
                TOTAL HARGA CANGKANG SAWIT
              </th>
              <th className="py-2.5 px-3 text-right bg-slate-100 border-b border-slate-300">
                TOTAL HARGA WOOD PELLET & DUST PELLET
              </th>
              <th className="py-2.5 px-3 text-right bg-slate-100 border-b border-slate-300">
                TOTAL HARGA KOPI PELLET
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
                      {row.rpPerTonSteam > 0 ? formatCurrencyExcel(row.rpPerTonSteam, 2) : 'Rp0'}
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
                    <td className="py-2 px-3 text-right text-emerald-900 tabular-nums">
                      {row.cangkangHarga > 0 ? formatCurrencyExcel(row.cangkangHarga, 0) : 'Rp0'}
                    </td>

                    {/* 12. TOTAL HARGA WOOD PELLET & DUST PELLET */}
                    <td className="py-2 px-3 text-right text-amber-900 tabular-nums">
                      {row.woodDustHarga > 0 ? formatCurrencyExcel(row.woodDustHarga, 0) : 'Rp0'}
                    </td>

                    {/* 13. TOTAL HARGA KOPI PELLET */}
                    <td className="py-2 px-3 text-right text-purple-900 tabular-nums">
                      {row.kopiHarga > 0 ? formatCurrencyExcel(row.kopiHarga, 0) : 'Rp0'}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={13} className="py-8 text-center text-slate-400 font-sans italic">
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
              <td className="py-3 px-3 text-right font-bold text-emerald-950">
                {formatCurrencyExcel(totals.totalCangkangHarga, 0)}
              </td>
              <td className="py-3 px-3 text-right font-bold text-amber-950">
                {formatCurrencyExcel(totals.totalWoodDustHarga, 0)}
              </td>
              <td className="py-3 px-3 text-right font-bold text-purple-950">
                {formatCurrencyExcel(totals.totalKopiHarga, 0)}
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
