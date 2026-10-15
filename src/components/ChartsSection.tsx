import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { DailyFuelSummary } from '../types/boiler';
import { FUEL_CONFIG, DAILY_CONSUMPTION_RECORDS, DailyConsumptionRecord } from '../data/initialData';
import { formatNumber, formatRupiah } from '../utils/calculations';
import { BarChart3, Percent, TrendingUp, Activity, Fuel, PieChart as PieIcon, CircleDollarSign } from 'lucide-react';

interface ChartsSectionProps {
  summaries: DailyFuelSummary[];
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({ summaries }) => {
  // Chart modes:
  // 1. volume: Total Konsumsi & Volume Spreadsheet (kg)
  // 2. percentage: Presentase (%) Komposisi (% Total Cangkang, Wood, Dust, Kopi)
  // 3. cost: Total Biaya per Hari (Rp)
  // 4. steam_efficiency: Grafik Steam Out & Rasio Efisiensi
  const [chartMode, setChartMode] = useState<'volume' | 'percentage' | 'cost' | 'steam_efficiency'>('volume');
  const [barStyle, setBarStyle] = useState<'stacked' | 'grouped'>('stacked');

  // Map pre-loaded spreadsheet records by date (YYYY-MM-DD and DD/MM/YYYY)
  const preloadedRecordsMap = useMemo(() => {
    const map = new Map<string, DailyConsumptionRecord>();
    DAILY_CONSUMPTION_RECORDS.forEach((r) => {
      map.set(r.isoDate, r);
      map.set(r.tanggal, r);
    });
    return map;
  }, []);

  // Prepare chart dataset 100% synchronized with the spreadsheet table
  const chartData = useMemo(() => {
    return summaries.map((s) => {
      const match = preloadedRecordsMap.get(s.tanggal) || preloadedRecordsMap.get(s.displayTanggal);

      const cangkangKg = match ? match.cangkangQty : (s.breakdown['CANGKANG']?.konsumsi || 0);
      const woodKg = match ? match.woodPelletQty : (s.breakdown['WOOD PELLET']?.konsumsi || 0);
      const dustKg = match ? match.dustPelletQty : (s.breakdown['DUST PELLET']?.konsumsi || 0);
      const kopiKg = match ? match.kopiPelletQty : (s.breakdown['KOPI PELLET']?.konsumsi || 0);
      const totalKonsumsi = match ? match.totalQty : s.totalKonsumsi;

      const cangkangCost = match ? match.cangkangHarga : (s.breakdown['CANGKANG']?.hargaTotal || 0);
      const woodCost = match ? match.woodPelletHarga : (s.breakdown['WOOD PELLET']?.hargaTotal || 0);
      const dustCost = match ? match.dustPelletHarga : (s.breakdown['DUST PELLET']?.hargaTotal || 0);
      const kopiCost = match ? match.kopiHarga : (s.breakdown['KOPI PELLET']?.hargaTotal || 0);
      const totalBiaya = match ? match.totalHarga : s.totalHarga;

      const steamOut = match ? match.steamOut : s.steamOut;
      const kgPerTonSteam = match ? match.kgPerTonSteam : s.kgPerTonSteam;
      const rpPerTonSteam = match ? match.rpPerTonSteam : s.rpPerTonSteam;

      const pctCangkang = totalKonsumsi > 0 ? (cangkangKg / totalKonsumsi) * 100 : 0;
      const pctWood = totalKonsumsi > 0 ? (woodKg / totalKonsumsi) * 100 : 0;
      const pctDust = totalKonsumsi > 0 ? (dustKg / totalKonsumsi) * 100 : 0;
      const pctKopi = totalKonsumsi > 0 ? (kopiKg / totalKonsumsi) * 100 : 0;

      return {
        tanggal: s.displayTanggal,
        rawTanggal: s.tanggal,

        // 1. TOTAL KONSUMSI DAN VOLUME SPREADSHEET
        'Total Konsumsi': totalKonsumsi,
        totalKonsumsi,
        'CANGKANG': cangkangKg,
        'WOOD PELLET': woodKg,
        'DUST PELLET': dustKg,
        'KOPI PELLET': kopiKg,
        cangkangKg,
        woodKg,
        dustKg,
        kopiKg,

        // 2. PRESENTASE
        pctCangkang: Number(pctCangkang.toFixed(2)),
        pctWood: Number(pctWood.toFixed(2)),
        pctDust: Number(pctDust.toFixed(2)),
        pctKopi: Number(pctKopi.toFixed(2)),
        '% TOTAL CANGKANG SAWIT': Number(pctCangkang.toFixed(2)),
        '% TOTAL WOOD PELLET': Number(pctWood.toFixed(2)),
        '% TOTAL DUST PELLET': Number(pctDust.toFixed(2)),
        '% TOTAL KOPI PELLET': Number(pctKopi.toFixed(2)),

        // 3. BIAYA PENGELUARAN (RP)
        'CANGKANG_COST': cangkangCost,
        'WOOD_PELLET_COST': woodCost,
        'DUST_PELLET_COST': dustCost,
        'KOPI_PELLET_COST': kopiCost,
        woodDustCost: woodCost + dustCost,
        'Total Biaya': totalBiaya,
        totalBiaya,

        // 4. STEAM OUT & EFISIENSI
        'Steam Out': steamOut,
        'Kg per Ton Steam': kgPerTonSteam,
        'Rp per Ton Steam': Math.round(rpPerTonSteam),
      };
    });
  }, [summaries, preloadedRecordsMap]);

  // Custom Tooltip (Dialog Batang) displaying Total Konsumsi, Volume Spreadsheet, Percentages, Cost, and Steam
  const CustomConsumptionTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div className="bg-slate-900/95 text-white p-3.5 rounded-xl border border-slate-700 shadow-2xl text-xs min-w-[320px] max-w-sm backdrop-blur-md">
        {/* Header Tanggal */}
        <div className="border-b border-slate-800 pb-2 mb-2 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 block uppercase">Tanggal Pengamatan</span>
            <span className="text-sm font-bold text-white">{data.tanggal}</span>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Data Sinkron Spreadsheet
          </span>
        </div>

        {/* 1. TOTAL KONSUMSI DAN VOLUME SPREADSHEET */}
        <div className="bg-slate-800/80 rounded-lg p-2.5 mb-2 border border-slate-700/60 space-y-1.5">
          <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Fuel className="w-3.5 h-3.5 text-amber-400" />
              1. TOTAL KONSUMSI & VOLUME SPREADSHEET
            </span>
          </div>
          <div className="flex items-center justify-between text-amber-200 text-xs font-mono font-bold bg-slate-900/60 p-1.5 rounded border border-slate-700/50">
            <span className="text-slate-300 font-sans">TOTAL KONSUMSI:</span>
            <span>{formatNumber(data.totalKonsumsi)} kg</span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[11px] font-mono pt-0.5">
            <div className="flex items-center justify-between px-1.5 py-1 rounded bg-slate-900/40 text-emerald-300 border border-emerald-900/30">
              <span className="text-[10px] text-slate-300">Cangkang:</span>
              <span>{formatNumber(data.CANGKANG || 0)} kg</span>
            </div>
            <div className="flex items-center justify-between px-1.5 py-1 rounded bg-slate-900/40 text-amber-300 border border-amber-900/30">
              <span className="text-[10px] text-slate-300">Wood:</span>
              <span>{formatNumber(data['WOOD PELLET'] || 0)} kg</span>
            </div>
            <div className="flex items-center justify-between px-1.5 py-1 rounded bg-slate-900/40 text-slate-300 border border-slate-800">
              <span className="text-[10px] text-slate-400">Dust:</span>
              <span>{formatNumber(data['DUST PELLET'] || 0)} kg</span>
            </div>
            <div className="flex items-center justify-between px-1.5 py-1 rounded bg-slate-900/40 text-purple-300 border border-purple-900/30">
              <span className="text-[10px] text-slate-300">Kopi:</span>
              <span>{formatNumber(data['KOPI PELLET'] || 0)} kg</span>
            </div>
          </div>
        </div>

        {/* 2. PRESENTASE */}
        <div className="bg-slate-800/80 rounded-lg p-2.5 mb-2 border border-slate-700/60 space-y-1.5">
          <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-emerald-400" />
              2. PRESENTASE
            </span>
            <span className="text-[10px] text-slate-400 font-mono">100% Komposisi</span>
          </div>
          <div className="space-y-1 text-[11px] font-mono">
            <div className="flex items-center justify-between px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-900/50 text-emerald-300">
              <span className="text-[10px] text-slate-200 font-sans">% TOTAL CANGKANG SAWIT:</span>
              <span className="font-bold">{data.pctCangkang.toFixed(2)}%</span>
            </div>
            <div className="flex items-center justify-between px-2 py-0.5 rounded bg-amber-950/40 border border-amber-900/50 text-amber-300">
              <span className="text-[10px] text-slate-200 font-sans">% TOTAL WOOD PELLET:</span>
              <span className="font-bold">{data.pctWood.toFixed(2)}%</span>
            </div>
            <div className="flex items-center justify-between px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700/50 text-slate-300">
              <span className="text-[10px] text-slate-300 font-sans">% TOTAL DUST PELLET:</span>
              <span className="font-bold">{data.pctDust.toFixed(2)}%</span>
            </div>
            <div className="flex items-center justify-between px-2 py-0.5 rounded bg-purple-950/40 border border-purple-900/50 text-purple-300">
              <span className="text-[10px] text-slate-200 font-sans">% TOTAL KOPI PELLET:</span>
              <span className="font-bold">{data.pctKopi.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* 3. BIAYA & STEAM OUT */}
        <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700/60 space-y-1.5">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="font-bold text-[10px] flex items-center gap-1">
              <CircleDollarSign className="w-3 h-3 text-emerald-400" />
              TOTAL BIAYA:
            </span>
            <span className="font-mono font-extrabold text-xs text-emerald-300">
              {formatRupiah(data.totalBiaya)}
            </span>
          </div>

          <div className="space-y-1 pt-1.5 border-t border-slate-700/50 text-[10px] font-mono">
            <div className="flex items-center justify-between text-emerald-300">
              <span className="text-slate-300 font-sans">1. kg bahan bakar / ton steam:</span>
              <span className="font-bold">{formatNumber(data['Kg per Ton Steam'])} kg/Ton</span>
            </div>
            <div className="flex items-center justify-between text-orange-300">
              <span className="text-slate-300 font-sans">2. Rp ton steam:</span>
              <span className="font-bold">{formatRupiah(data['Rp per Ton Steam'])}/Ton</span>
            </div>
            <div className="flex items-center justify-between text-sky-300">
              <span className="text-slate-300 font-sans">3. steam out:</span>
              <span className="font-bold">{formatNumber(data['Steam Out'])} Ton</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Dedicated Tooltip for Steam Out Chart strictly displaying:
  // 1. kg bahan bakar / ton steam
  // 2. Rp ton steam
  // 3. steam out
  const CustomSteamTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div className="bg-slate-900/95 text-white p-3.5 rounded-xl border border-sky-500/40 shadow-2xl text-xs min-w-[310px] max-w-sm backdrop-blur-md">
        {/* Header Tanggal */}
        <div className="border-b border-slate-800 pb-2 mb-2.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 block uppercase">Tanggal Pengamatan</span>
            <span className="text-sm font-bold text-white">{data.tanggal}</span>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
            Grafik Steam Out
          </span>
        </div>

        {/* 3 Item Utama yang Diminta */}
        <div className="space-y-2">
          {/* 1. kg bahan bakar / ton steam */}
          <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                1
              </span>
              <span className="text-[11px] font-semibold text-slate-200">
                kg bahan bakar / ton steam:
              </span>
            </div>
            <span className="font-mono font-bold text-xs text-emerald-300">
              {formatNumber(data['Kg per Ton Steam'])} kg/Ton
            </span>
          </div>

          {/* 2. Rp ton steam */}
          <div className="p-2.5 rounded-lg bg-orange-950/40 border border-orange-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold">
                2
              </span>
              <span className="text-[11px] font-semibold text-slate-200">
                Rp ton steam:
              </span>
            </div>
            <span className="font-mono font-bold text-xs text-orange-300">
              {formatRupiah(data['Rp per Ton Steam'])}/Ton
            </span>
          </div>

          {/* 3. steam out */}
          <div className="p-2.5 rounded-lg bg-sky-950/40 border border-sky-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 text-[10px] font-bold">
                3
              </span>
              <span className="text-[11px] font-semibold text-slate-200">
                steam out:
              </span>
            </div>
            <span className="font-mono font-bold text-xs text-sky-300">
              {formatNumber(data['Steam Out'])} Ton
            </span>
          </div>
        </div>

        {/* Ringkasan Sinkron Data Operasional */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>Total Konsumsi: {formatNumber(data.totalKonsumsi)} kg</span>
          <span>Total Biaya: {formatRupiah(data.totalBiaya)}</span>
        </div>
      </div>
    );
  };

  // Donut data for aggregate fuel consumption, percentages, and costs
  const fuelAggregates = useMemo(() => {
    let totalCangkangKg = 0;
    let totalWoodKg = 0;
    let totalDustKg = 0;
    let totalKopiKg = 0;

    let totalCangkangCost = 0;
    let totalWoodCost = 0;
    let totalDustCost = 0;
    let totalKopiCost = 0;

    chartData.forEach((row) => {
      totalCangkangKg += row.CANGKANG;
      totalWoodKg += row['WOOD PELLET'];
      totalDustKg += row['DUST PELLET'];
      totalKopiKg += row['KOPI PELLET'];

      totalCangkangCost += row.CANGKANG_COST;
      totalWoodCost += row.WOOD_PELLET_COST;
      totalDustCost += row.DUST_PELLET_COST;
      totalKopiCost += row.KOPI_PELLET_COST;
    });

    const totalAggregateKg = totalCangkangKg + totalWoodKg + totalDustKg + totalKopiKg;
    const totalAggregateCost = totalCangkangCost + totalWoodCost + totalDustCost + totalKopiCost;

    return {
      volumeData: [
        {
          name: 'Cangkang Sawit',
          valueKg: totalCangkangKg,
          color: FUEL_CONFIG['CANGKANG'].color,
        },
        {
          name: 'Wood Pellet',
          valueKg: totalWoodKg,
          color: FUEL_CONFIG['WOOD PELLET'].color,
        },
        {
          name: 'Dust Pellet',
          valueKg: totalDustKg,
          color: FUEL_CONFIG['DUST PELLET'].color,
        },
        {
          name: 'Kopi Pellet',
          valueKg: totalKopiKg,
          color: FUEL_CONFIG['KOPI PELLET'].color,
        },
      ],
      percentageData: [
        {
          name: '% Total Cangkang Sawit',
          value: totalAggregateKg > 0 ? Number(((totalCangkangKg / totalAggregateKg) * 100).toFixed(2)) : 0,
          color: FUEL_CONFIG['CANGKANG'].color,
          kg: totalCangkangKg,
        },
        {
          name: '% Total Wood Pellet',
          value: totalAggregateKg > 0 ? Number(((totalWoodKg / totalAggregateKg) * 100).toFixed(2)) : 0,
          color: FUEL_CONFIG['WOOD PELLET'].color,
          kg: totalWoodKg,
        },
        {
          name: '% Total Dust Pellet',
          value: totalAggregateKg > 0 ? Number(((totalDustKg / totalAggregateKg) * 100).toFixed(2)) : 0,
          color: FUEL_CONFIG['DUST PELLET'].color,
          kg: totalDustKg,
        },
        {
          name: '% Total Kopi Pellet',
          value: totalAggregateKg > 0 ? Number(((totalKopiKg / totalAggregateKg) * 100).toFixed(2)) : 0,
          color: FUEL_CONFIG['KOPI PELLET'].color,
          kg: totalKopiKg,
        },
      ],
      costData: [
        {
          name: 'Cangkang Sawit',
          valueCost: totalCangkangCost,
          color: FUEL_CONFIG['CANGKANG'].color,
        },
        {
          name: 'Wood Pellet',
          valueCost: totalWoodCost,
          color: FUEL_CONFIG['WOOD PELLET'].color,
        },
        {
          name: 'Dust Pellet',
          valueCost: totalDustCost,
          color: FUEL_CONFIG['DUST PELLET'].color,
        },
        {
          name: 'Kopi Pellet',
          valueCost: totalKopiCost,
          color: FUEL_CONFIG['KOPI PELLET'].color,
        },
      ],
      totalKg: totalAggregateKg,
      totalCost: totalAggregateCost,
    };
  }, [chartData]);

  return (
    <div className="space-y-6">
      {/* Chart Navigation and Toggles */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Toggle Mode: 1. Volume & Konsumsi, 2. Presentase, 3. Biaya, 4. Steam Out */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg flex-wrap">
          <button
            onClick={() => setChartMode('volume')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              chartMode === 'volume'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-500" />
            <span>1. Total Konsumsi & Volume Spreadsheet (kg)</span>
          </button>

          <button
            onClick={() => setChartMode('percentage')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              chartMode === 'percentage'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Percent className="w-3.5 h-3.5 text-emerald-500" />
            <span>2. Presentase (%)</span>
          </button>

          <button
            onClick={() => setChartMode('cost')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              chartMode === 'cost'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
            <span>3. Biaya per Day (Rp)</span>
          </button>

          <button
            onClick={() => setChartMode('steam_efficiency')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              chartMode === 'steam_efficiency'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-sky-600" />
            <span>4. Grafik Steam Out</span>
          </button>
        </div>

        {/* Bar layout toggle (Stacked vs Grouped) */}
        {chartMode !== 'steam_efficiency' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Tampilan Bar:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setBarStyle('stacked')}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  barStyle === 'stacked'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {chartMode === 'percentage' ? 'Stacked (100% Komposisi)' : 'Stacked (Akumulasi)'}
              </button>
              <button
                onClick={() => setBarStyle('grouped')}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  barStyle === 'grouped'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Berdampingan
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Interactive Chart Canvas */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {chartMode === 'volume' && '1. Total Konsumsi dan Volume Spreadsheet (kg)'}
              {chartMode === 'percentage' && '2. Presentase Komposisi Bahan Bakar (% Total)'}
              {chartMode === 'cost' && '3. Grafik Biaya Konsumsi Bahan Bakar per Day (Rp)'}
              {chartMode === 'steam_efficiency' && '4. Grafik Produksi Steam Out (Ton) & Biaya per Ton Steam'}
            </h3>
            <p className="text-xs text-slate-500">
              {chartMode === 'volume' && 'Menampilkan total konsumsi harian dan volume masing-masing bahan bakar tersinkronisasi dari spreadsheet.'}
              {chartMode === 'percentage' && 'Menampilkan presentase % Total Cangkang Sawit, % Total Wood Pellet, % Total Dust Pellet, dan % Total Kopi Pellet.'}
              {chartMode === 'cost' && 'Menampilkan biaya pengeluaran harian per jenis bahan bakar dan total biaya operasional boiler.'}
              {chartMode === 'steam_efficiency' && 'Evaluasi performa efisiensi boiler: produksi steam harian (Ton), spesifik konsumsi (kg/Ton), dan unit cost (Rp/Ton).'}
            </p>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            {summaries.length} Hari Pengamatan
          </div>
        </div>

        {/* 1. TOTAL KONSUMSI DAN VOLUME SPREADSHEET */}
        {chartMode === 'volume' && (
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="tanggal" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  label={{ value: 'Volume Konsumsi (kg)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 11 } }}
                />
                <Tooltip
                  content={<CustomConsumptionTooltip />}
                  wrapperStyle={{ zIndex: 9999, pointerEvents: 'none' }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '14px', fontSize: '12px', zIndex: 1 }}
                />
                <Bar
                  dataKey="CANGKANG"
                  name="Cangkang Sawit"
                  stackId={barStyle === 'stacked' ? 'a' : undefined}
                  fill={FUEL_CONFIG['CANGKANG'].color}
                  radius={barStyle === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                />
                <Bar
                  dataKey="WOOD PELLET"
                  name="Wood Pellet"
                  stackId={barStyle === 'stacked' ? 'a' : undefined}
                  fill={FUEL_CONFIG['WOOD PELLET'].color}
                  radius={barStyle === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                />
                <Bar
                  dataKey="DUST PELLET"
                  name="Dust Pellet"
                  stackId={barStyle === 'stacked' ? 'a' : undefined}
                  fill={FUEL_CONFIG['DUST PELLET'].color}
                  radius={barStyle === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                />
                <Bar
                  dataKey="KOPI PELLET"
                  name="Kopi Pellet"
                  stackId={barStyle === 'stacked' ? 'a' : undefined}
                  fill={FUEL_CONFIG['KOPI PELLET'].color}
                  radius={barStyle === 'stacked' ? [4, 4, 0, 0] : [4, 4, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="Total Konsumsi"
                  name="Total Konsumsi Spreadsheet"
                  stroke="#0f172a"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#0f172a' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 2. PRESENTASE (% Total Cangkang, Wood, Dust, Kopi) */}
        {chartMode === 'percentage' && (
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="tanggal" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => `${val}%`}
                  label={{ value: 'Presentase (%)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 11 } }}
                />
                <Tooltip
                  content={<CustomConsumptionTooltip />}
                  wrapperStyle={{ zIndex: 9999, pointerEvents: 'none' }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '14px', fontSize: '12px', zIndex: 1 }}
                />
                <Bar
                  dataKey="% TOTAL CANGKANG SAWIT"
                  name="% TOTAL CANGKANG SAWIT"
                  stackId={barStyle === 'stacked' ? 'pct' : undefined}
                  fill={FUEL_CONFIG['CANGKANG'].color}
                  radius={barStyle === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                />
                <Bar
                  dataKey="% TOTAL WOOD PELLET"
                  name="% TOTAL WOOD PELLET"
                  stackId={barStyle === 'stacked' ? 'pct' : undefined}
                  fill={FUEL_CONFIG['WOOD PELLET'].color}
                  radius={barStyle === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                />
                <Bar
                  dataKey="% TOTAL DUST PELLET"
                  name="% TOTAL DUST PELLET"
                  stackId={barStyle === 'stacked' ? 'pct' : undefined}
                  fill={FUEL_CONFIG['DUST PELLET'].color}
                  radius={barStyle === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                />
                <Bar
                  dataKey="% TOTAL KOPI PELLET"
                  name="% TOTAL KOPI PELLET"
                  stackId={barStyle === 'stacked' ? 'pct' : undefined}
                  fill={FUEL_CONFIG['KOPI PELLET'].color}
                  radius={barStyle === 'stacked' ? [4, 4, 0, 0] : [4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 3. BIAYA PER DAY (RP) */}
        {chartMode === 'cost' && (
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="tanggal" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => `Rp${(val / 1000000).toFixed(0)}jt`}
                  label={{ value: 'Total Biaya (Rp)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 11 } }}
                />
                <Tooltip
                  content={<CustomConsumptionTooltip />}
                  wrapperStyle={{ zIndex: 9999, pointerEvents: 'none' }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '14px', fontSize: '12px', zIndex: 1 }}
                />
                <Bar
                  dataKey="CANGKANG_COST"
                  name="Cangkang Sawit"
                  stackId={barStyle === 'stacked' ? 'cost' : undefined}
                  fill={FUEL_CONFIG['CANGKANG'].color}
                />
                <Bar
                  dataKey="WOOD_PELLET_COST"
                  name="Wood Pellet"
                  stackId={barStyle === 'stacked' ? 'cost' : undefined}
                  fill={FUEL_CONFIG['WOOD PELLET'].color}
                />
                <Bar
                  dataKey="DUST_PELLET_COST"
                  name="Dust Pellet"
                  stackId={barStyle === 'stacked' ? 'cost' : undefined}
                  fill={FUEL_CONFIG['DUST PELLET'].color}
                />
                <Bar
                  dataKey="KOPI_PELLET_COST"
                  name="Kopi Pellet"
                  stackId={barStyle === 'stacked' ? 'cost' : undefined}
                  fill={FUEL_CONFIG['KOPI PELLET'].color}
                />
                <Line
                  type="monotone"
                  dataKey="Total Biaya"
                  name="Total Biaya Harian"
                  stroke="#0f172a"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#0f172a' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 4. GRAFIK STEAM OUT & EFISIENSI */}
        {chartMode === 'steam_efficiency' && (
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="tanggal" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  label={{ value: 'Steam Out (Ton)', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 11 } }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => `Rp${(val / 1000).toFixed(0)}k`}
                  label={{ value: 'Biaya Steam (Rp/Ton)', angle: 90, position: 'insideRight', style: { fill: '#64748b', fontSize: 11 } }}
                />
                <Tooltip
                  content={<CustomSteamTooltip />}
                  wrapperStyle={{ zIndex: 9999, pointerEvents: 'none' }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '14px', fontSize: '12px', zIndex: 1 }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="Steam Out"
                  name="Steam Out (Ton)"
                  fill="#0284c7"
                  radius={[4, 4, 0, 0]}
                  barSize={32}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="Rp per Ton Steam"
                  name="Rp per Ton Steam"
                  stroke="#ea580c"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#ea580c' }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="Kg per Ton Steam"
                  name="Kg Bahan Bakar / Ton Steam"
                  stroke="#16a34a"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#16a34a' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Three Column Mix Breakdown: Volume (kg), Percentage (%), and Cost (Rp) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Donut 1: Volume Konsumsi Spreadsheet */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                1. Volume Konsumsi (KG)
              </h4>
            </div>
            <span className="text-[11px] text-slate-500 font-mono font-semibold">
              Total {formatNumber(fuelAggregates.totalKg)} kg
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fuelAggregates.volumeData}
                  dataKey="valueKg"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {fuelAggregates.volumeData.map((entry, index) => (
                    <Cell key={`cell-vol-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${formatNumber(Number(val))} kg`, 'Volume Konsumsi']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut 2: Presentase Komposisi (%) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-emerald-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                2. Presentase (%) Komposisi
              </h4>
            </div>
            <span className="text-[11px] text-slate-500 font-mono font-semibold">
              100% Komposisi
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fuelAggregates.percentageData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {fuelAggregates.percentageData.map((entry, index) => (
                    <Cell key={`cell-pct-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, _name: any, item: any) => [
                    `${val}% (${formatNumber(item.payload.kg)} kg)`,
                    item.payload.name
                  ]}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut 3: Biaya Pengeluaran (RP) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="w-4 h-4 text-teal-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                3. Distribusi Biaya (RP)
              </h4>
            </div>
            <span className="text-[11px] text-slate-500 font-mono font-semibold">
              Total {formatRupiah(fuelAggregates.totalCost)}
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fuelAggregates.costData}
                  dataKey="valueCost"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {fuelAggregates.costData.map((entry, index) => (
                    <Cell key={`cell-cost-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [formatRupiah(Number(val)), 'Total Biaya']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
