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
  ReferenceLine,
} from 'recharts';
import { DailyFuelSummary } from '../types/boiler';
import { FUEL_CONFIG, DAILY_CONSUMPTION_RECORDS, DailyConsumptionRecord } from '../data/initialData';
import { formatNumber, formatRupiah, parseDateToIso } from '../utils/calculations';
import { BarChart3, Percent, TrendingUp, Activity, Fuel, PieChart as PieIcon, CircleDollarSign, Eye, EyeOff, Gauge } from 'lucide-react';

interface ChartsSectionProps {
  summaries: DailyFuelSummary[];
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({ summaries }) => {
  // Chart modes:
  // 1. kg_steam: GRAFIK SENDIRI: HANYA MENAMPILKAN GRAFIK KG/TON STEAM
  // 2. volume: Total Konsumsi & Volume Spreadsheet (kg)
  // 3. percentage: Presentase (%) Komposisi (% Total Cangkang, Wood, Dust, Kopi)
  // 4. cost: Total Biaya per Hari (Rp)
  // 5. steam_efficiency: Grafik Steam Out & Rasio Efisiensi
  const [chartMode, setChartMode] = useState<'kg_steam' | 'volume' | 'percentage' | 'cost' | 'steam_efficiency'>('kg_steam');
  const [barStyle, setBarStyle] = useState<'stacked' | 'grouped'>('stacked');
  // Sembunyikan fitur: default true (fitur Presentase dan Biaya disembunyikan sesuai permintaan)
  const [hideSecondaryFeatures, setHideSecondaryFeatures] = useState<boolean>(true);

  // Map pre-loaded spreadsheet records by date (YYYY-MM-DD and DD/MM/YYYY)
  const preloadedRecordsMap = useMemo(() => {
    const map = new Map<string, DailyConsumptionRecord>();
    DAILY_CONSUMPTION_RECORDS.forEach((r) => {
      map.set(r.isoDate, r);
      map.set(r.tanggal, r);
    });
    return map;
  }, []);

  // Prepare chart dataset 100% synchronized with the spreadsheet table and real-time data
  // URUTAN TANGGAL: Tanggal paling terakhir berada di sebelah kiri (Terbaru -> Terlama)
  const chartData = useMemo(() => {
    const sortedSummaries = [...summaries].sort((a, b) => {
      const isoA = parseDateToIso(a.tanggal) || parseDateToIso(a.displayTanggal) || a.tanggal || '';
      const isoB = parseDateToIso(b.tanggal) || parseDateToIso(b.displayTanggal) || b.tanggal || '';
      return isoB.localeCompare(isoA); // Tanggal terbaru berada di sebelah kiri (index 0)
    });

    return sortedSummaries.map((s) => {
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

      const cangkangKg = useLive ? (s.breakdown['CANGKANG']?.konsumsi || 0) : (match ? match.cangkangQty : 0);
      const woodKg = useLive ? (s.breakdown['WOOD PELLET']?.konsumsi || 0) : (match ? match.woodPelletQty : 0);
      const dustKg = useLive ? (s.breakdown['DUST PELLET']?.konsumsi || 0) : (match ? match.dustPelletQty : 0);
      const kopiKg = useLive ? (s.breakdown['KOPI PELLET']?.konsumsi || 0) : (match ? match.kopiPelletQty : 0);

      const totalKonsumsi = useLive
        ? (s.totalKonsumsi > 0 ? s.totalKonsumsi : (cangkangKg + woodKg + dustKg + kopiKg))
        : (match ? match.totalQty : (cangkangKg + woodKg + dustKg + kopiKg));

      const cangkangCost = useLive 
        ? (s.breakdown['CANGKANG']?.hargaTotal || 0) 
        : (match ? match.cangkangHarga : (cangkangKg > 0 ? cangkangKg * 1710 : 0));

      const woodCost = useLive 
        ? (s.breakdown['WOOD PELLET']?.hargaTotal || 0) 
        : (match ? match.woodPelletHarga : (woodKg > 0 ? woodKg * 1788 : 0));

      const dustCost = useLive 
        ? (s.breakdown['DUST PELLET']?.hargaTotal || 0) 
        : (match ? match.dustPelletHarga : (dustKg > 0 ? dustKg * 1950 : 0));

      const kopiCost = useLive 
        ? (s.breakdown['KOPI PELLET']?.hargaTotal || 0) 
        : (match ? match.kopiHarga : (kopiKg > 0 ? kopiKg * 2200 : 0));

      const calcTotalBiaya = cangkangCost + woodCost + dustCost + kopiCost;
      const totalBiaya = useLive
        ? (s.totalHarga > 0 ? s.totalHarga : calcTotalBiaya)
        : (match ? match.totalHarga : calcTotalBiaya);

      const steamOut = s.steamOut > 0 ? s.steamOut : (match ? match.steamOut : 0);
      const kgPerTonSteam = steamOut > 0 ? Math.round(totalKonsumsi / steamOut) : (match ? match.kgPerTonSteam : 0);
      const rpPerTonSteam = steamOut > 0 ? totalBiaya / steamOut : (match ? match.rpPerTonSteam : 0);

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
            <div className="flex items-center justify-between text-slate-200">
              <span className="text-slate-300 font-sans">1. Kg/Ton steam:</span>
              <span className="font-bold text-white">{formatNumber(data['Kg per Ton Steam'])} kg/Ton</span>
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
            Produksi Steam Out &amp; Biaya Steam
          </span>
        </div>

        {/* 3 Item Utama yang Diminta */}
        <div className="space-y-2">
          {/* 1. Kg/Ton steam */}
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-slate-100 text-[10px] font-bold border border-slate-600">
                1
              </span>
              <span className="text-[11px] font-semibold text-slate-200">
                Kg/Ton steam:
              </span>
            </div>
            <span className="font-mono font-bold text-xs text-white">
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

  // Dedicated Tooltip khusus grafik Kg/Ton Steam
  const CustomKgSteamTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div className="bg-slate-900/95 text-white p-3.5 rounded-xl border border-slate-700 shadow-2xl text-xs min-w-[280px] max-w-sm backdrop-blur-md">
        <div className="border-b border-slate-800 pb-2 mb-2.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 block uppercase">Tanggal Pengamatan</span>
            <span className="text-sm font-bold text-white">{data.tanggal}</span>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-600">
            Rasio Efisiensi
          </span>
        </div>

        <div className="p-3 rounded-lg bg-black/70 border border-slate-700 space-y-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            KG/TON STEAM
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-white tracking-tight">
              {formatNumber(data['Kg per Ton Steam'])}
            </span>
            <span className="text-xs text-slate-300 font-medium">kg bahan bakar / Ton steam</span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Steam Out: {formatNumber(data['Steam Out'])} Ton</span>
          <span>Bahan Bakar: {formatNumber(data.totalKonsumsi)} kg</span>
        </div>
      </div>
    );
  };

  // KPI Statistik khusus Kg/Ton Steam
  const kgSteamStats = useMemo(() => {
    const valid = chartData.filter((d) => d['Kg per Ton Steam'] > 0);
    if (valid.length === 0) return { avg: 0, min: 0, max: 0, count: 0 };
    const values = valid.map((d) => d['Kg per Ton Steam']);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / values.length);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { avg, min, max, count: valid.length };
  }, [chartData]);

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
        {/* Toggle Mode Urutan: 1. GRAFIK KG.TON STEAM, 2. RP/ TON STEAM & STEAM OUT, 3. ALL GRAFIK, 4. TOTAL KONSUMSI */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg flex-wrap">
          {/* 1. GRAFIK KG.TON STEAM */}
          <button
            onClick={() => setChartMode('kg_steam')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${
              chartMode === 'kg_steam'
                ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-800'
                : 'bg-white text-slate-700 hover:text-slate-950 border border-slate-200'
            }`}
            title="Grafik rasio Kg/Ton steam"
          >
            <Gauge className={`w-3.5 h-3.5 ${chartMode === 'kg_steam' ? 'text-emerald-400' : 'text-slate-700'}`} />
            <span>GRAFIK KG.TON STEAM</span>
          </button>

          {/* 2. RP/ TON STEAM & STEAM OUT */}
          <button
            onClick={() => setChartMode('cost')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              chartMode === 'cost'
                ? 'bg-white text-slate-900 shadow-sm font-semibold ring-1 ring-teal-500/30'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
            <span>RP/ TON STEAM &amp; STEAM OUT</span>
          </button>

          {/* 3. ALL GRAFIK (CSS Selector 1) */}
          <button
            onClick={() => setChartMode('steam_efficiency')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${
              chartMode === 'steam_efficiency'
                ? 'bg-white text-sky-950 shadow-sm font-bold ring-1 ring-sky-500/40'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-sky-600" />
            <span>ALL GRAFIK</span>
          </button>

          {/* 4. TOTAL KONSUMSI */}
          <button
            onClick={() => setChartMode('volume')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              chartMode === 'volume'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-500" />
            <span>TOTAL KONSUMSI</span>
          </button>
        </div>

        {/* Bar layout toggle (Stacked vs Grouped) */}
        {chartMode !== 'steam_efficiency' && chartMode !== 'kg_steam' && (
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
              {chartMode === 'kg_steam' && 'Grafik Kg/Ton steam'}
              {chartMode === 'cost' && 'Grafik RP/ TON STEAM & STEAM OUT'}
              {chartMode === 'steam_efficiency' && 'ALL GRAFIK (Produksi Steam Out & Biaya per Ton Steam)'}
              {chartMode === 'volume' && 'Total Konsumsi Bahan Bakar'}
            </h3>
            <p className="text-xs text-slate-500">
              {chartMode === 'kg_steam' && 'Memantau performa Kg/Ton steam (kg bahan bakar per Ton steam yang dihasilkan) berwarna hitam.'}
              {chartMode === 'cost' && 'Menampilkan perbandingan biaya pengeluaran bahan bakar harian (Rp) dengan garis Data Steam Out (Ton) berwarna hitam.'}
              {chartMode === 'steam_efficiency' && 'Evaluasi performa efisiensi boiler: produksi steam harian (Ton), spesifik konsumsi (kg/Ton), dan unit cost (Rp/Ton).'}
              {chartMode === 'volume' && 'Menampilkan volume konsumsi bahan bakar harian (kg).'}
            </p>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            {summaries.length} Hari Pengamatan
          </div>
        </div>

        {/* GRAFIK SENDIRI: HANYA MENAMPILKAN GRAFIK KG/TON STEAM */}
        {chartMode === 'kg_steam' && (
          <div className="space-y-4">
            {/* KPI Cards Ringkasan Khusus Kg/Ton Steam */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 block">Rata-rata Kg/Ton Steam</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black font-mono text-slate-900">{kgSteamStats.avg}</span>
                  <span className="text-xs text-slate-500 font-medium">kg/Ton</span>
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
                <span className="text-[11px] font-semibold text-emerald-600 block">Paling Efisien (Min)</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black font-mono text-emerald-700">{kgSteamStats.min}</span>
                  <span className="text-xs text-emerald-600 font-medium">kg/Ton</span>
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
                <span className="text-[11px] font-semibold text-amber-600 block">Konsumsi Tertinggi (Max)</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black font-mono text-amber-700">{kgSteamStats.max}</span>
                  <span className="text-xs text-amber-600 font-medium">kg/Ton</span>
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 block">Total Pengamatan</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black font-mono text-slate-900">{kgSteamStats.count}</span>
                  <span className="text-xs text-slate-500 font-medium">Hari</span>
                </div>
              </div>
            </div>

            {/* Kanvas Grafik Mandiri: Hanya menampilkan Kg/Ton Steam (Warna Hitam) */}
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="tanggal" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    domain={['dataMin - 15', 'dataMax + 15']}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    label={{
                      value: 'Kg/Ton steam (kg bahan bakar / Ton steam)',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fill: '#0f172a', fontSize: 11, fontWeight: 700 },
                    }}
                  />
                  <Tooltip
                    content={<CustomKgSteamTooltip />}
                    wrapperStyle={{ zIndex: 9999, pointerEvents: 'none' }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '14px', fontSize: '12px', zIndex: 1 }}
                  />
                  <ReferenceLine
                    y={kgSteamStats.avg}
                    stroke="#16a34a"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Rata-rata: ${kgSteamStats.avg} kg/Ton`,
                      position: 'top',
                      fill: '#15803d',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  />
                  {/* Bar: Warna Hitam (#000000) sesuai permintaan user */}
                  <Bar
                    dataKey="Kg per Ton Steam"
                    name="Kg/Ton steam"
                    fill="#000000"
                    radius={[4, 4, 0, 0]}
                    barSize={24}
                  />
                  {/* Line Trend: Garis Hitam (#000000) */}
                  <Line
                    type="monotone"
                    dataKey="Kg per Ton Steam"
                    name="Tren Kg/Ton steam"
                    stroke="#000000"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#000000', stroke: '#ffffff', strokeWidth: 1.5 }}
                    activeDot={{ r: 6, fill: '#000000' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 1. TOTAL KONSUMSI DAN VOLUME SPREADSHEET */}
        {chartMode === 'volume' && (
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
              </BarChart>
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

        {/* 3. BIAYA PER DAY (RP) & STEAM OUT */}
        {chartMode === 'cost' && (
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 35, left: 30, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="tanggal" tick={{ fontSize: 11, fill: '#64748b' }} />
                {/* Sumbu Y Kiri: Biaya Bahan Bakar (Rp) */}
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => `Rp${(val / 1000000).toFixed(0)}jt`}
                  label={{ value: 'Total Biaya (Rp)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 11 } }}
                />
                {/* Sumbu Y Kanan: Garis Data Steam Out (Ton) */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={['dataMin - 30', 'dataMax + 30']}
                  tick={{ fontSize: 11, fill: '#000000' }}
                  tickFormatter={(val) => `${val} T`}
                  label={{ value: 'Data Steam Out (Ton)', angle: 90, position: 'insideRight', style: { fill: '#000000', fontSize: 11, fontWeight: 700 } }}
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
                  yAxisId="left"
                  dataKey="CANGKANG_COST"
                  name="Cangkang Sawit"
                  stackId={barStyle === 'stacked' ? 'cost' : undefined}
                  fill={FUEL_CONFIG['CANGKANG'].color}
                />
                <Bar
                  yAxisId="left"
                  dataKey="WOOD_PELLET_COST"
                  name="Wood Pellet"
                  stackId={barStyle === 'stacked' ? 'cost' : undefined}
                  fill={FUEL_CONFIG['WOOD PELLET'].color}
                />
                <Bar
                  yAxisId="left"
                  dataKey="DUST_PELLET_COST"
                  name="Dust Pellet"
                  stackId={barStyle === 'stacked' ? 'cost' : undefined}
                  fill={FUEL_CONFIG['DUST PELLET'].color}
                />
                <Bar
                  yAxisId="left"
                  dataKey="KOPI_PELLET_COST"
                  name="Kopi Pellet"
                  stackId={barStyle === 'stacked' ? 'cost' : undefined}
                  fill={FUEL_CONFIG['KOPI PELLET'].color}
                />
                {/* Garis grafik DATA STEAM OUT warna HITAM (#000000) dan di urutan sebelah PALING KANAN legend */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="Steam Out"
                  name="Data Steam Out (Ton)"
                  stroke="#000000"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#000000', stroke: '#ffffff', strokeWidth: 1.5 }}
                  activeDot={{ r: 6, fill: '#000000' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 3. GRAFIK PRODUKSI STEAM OUT & BIAYA PER TON STEAM (Persis Sesuai Screenshot) */}
        {chartMode === 'steam_efficiency' && (
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="tanggal" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  yAxisId="left"
                  domain={[0, 600]}
                  ticks={[0, 150, 300, 450, 600]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  label={{ value: 'Steam Out (Ton)', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 11 } }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 800000]}
                  ticks={[0, 200000, 400000, 600000, 800000]}
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
                {/* 1. Kg/Ton steam (garis hitam putus-putus dengan dot hitam) */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="Kg per Ton Steam"
                  name="Kg/Ton steam"
                  stroke="#000000"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  dot={{ r: 3.5, fill: '#000000' }}
                />
                {/* 2. Rp per Ton Steam (garis oranye dengan dot oranye) */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="Rp per Ton Steam"
                  name="Rp per Ton Steam"
                  stroke="#ea580c"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#ea580c' }}
                />
                {/* 3. Steam Out (Ton) (bar warna biru #0284c7) */}
                <Bar
                  yAxisId="left"
                  dataKey="Steam Out"
                  name="Steam Out (Ton)"
                  fill="#0284c7"
                  radius={[4, 4, 0, 0]}
                  barSize={32}
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
