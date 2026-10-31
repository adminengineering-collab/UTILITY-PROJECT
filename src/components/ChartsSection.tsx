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
  LabelList,
} from 'recharts';
import { DailyFuelSummary } from '../types/boiler';
import { FUEL_CONFIG, DAILY_CONSUMPTION_RECORDS, DailyConsumptionRecord } from '../data/initialData';
import { formatNumber, formatRupiah, parseDateToIso } from '../utils/calculations';
import { BarChart3, Percent, TrendingUp, Activity, Fuel, PieChart as PieIcon, CircleDollarSign, Eye, EyeOff, Gauge, Coins } from 'lucide-react';

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
  // Bulan aktif untuk diagram lingkaran rata-rata harga fuel (default: '2026-10')
  const [selectedMonthForAvgPrice, setSelectedMonthForAvgPrice] = useState<string>('2026-10');
  // Filter bahan bakar untuk diagram tertinggi & terendah tiap jenis bahan bakar
  const [selectedFuelExtreme, setSelectedFuelExtreme] = useState<'ALL' | 'CK' | 'WP' | 'DP' | 'KP'>('ALL');

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

  // Perhitungan Rata-Rata Harga per Bulan dibagi 4 Vendor:
  // 1. CK ( CANGKANG )
  // 2. WP ( WOOD PELLET )
  // 3. DP ( DUST PELLET )
  // 4. KP ( KOPI PELLET )
  const monthlyVendorPrices = useMemo(() => {
    const monthsMap: Record<string, {
      ckHarga: number; ckQty: number;
      wpHarga: number; wpQty: number;
      dpHarga: number; dpQty: number;
      kpHarga: number; kpQty: number;
    }> = {};

    chartData.forEach((row) => {
      let monthKey = '';
      if (row.rawTanggal && row.rawTanggal.includes('-')) {
        monthKey = row.rawTanggal.substring(0, 7);
      } else if (row.rawTanggal && row.rawTanggal.includes('/')) {
        const parts = row.rawTanggal.split('/');
        if (parts.length === 3) monthKey = `${parts[2]}-${parts[1]}`;
      } else if (row.tanggal && row.tanggal.includes('/')) {
        const parts = row.tanggal.split('/');
        if (parts.length === 3) monthKey = `${parts[2]}-${parts[1]}`;
      }

      if (!monthKey) monthKey = '2026-10';

      if (!monthsMap[monthKey]) {
        monthsMap[monthKey] = {
          ckHarga: 0, ckQty: 0,
          wpHarga: 0, wpQty: 0,
          dpHarga: 0, dpQty: 0,
          kpHarga: 0, kpQty: 0,
        };
      }

      monthsMap[monthKey].ckHarga += row.CANGKANG_COST || 0;
      monthsMap[monthKey].ckQty += row.cangkangKg || 0;
      monthsMap[monthKey].wpHarga += row.WOOD_PELLET_COST || 0;
      monthsMap[monthKey].wpQty += row.woodKg || 0;
      monthsMap[monthKey].dpHarga += row.DUST_PELLET_COST || 0;
      monthsMap[monthKey].dpQty += row.dustKg || 0;
      monthsMap[monthKey].kpHarga += row.KOPI_PELLET_COST || 0;
      monthsMap[monthKey].kpQty += row.kopiKg || 0;
    });

    const monthNames: Record<string, string> = {
      '2026-02': 'Februari 2026',
      '2026-08': 'Agustus 2026',
      '2026-09': 'September 2026',
      '2026-10': 'Oktober 2026',
    };

    return Object.keys(monthsMap).sort().map((m) => {
      const d = monthsMap[m];
      
      // Nilai resmi spreadsheet terbaru (kolom S, T, U, V dari spreadsheet operasional):
      // Okt 2026: CK 1679, WP 1671, DP 1594, KP 0
      // Sep 2026: CK 1700, WP 1687, DP 1600, KP 0
      // Agu 2026: CK 1726, WP 1750, DP 1599, KP 0
      // Feb 2026: CK 1709, WP 1586, DP 0, KP 2200
      let ck = d.ckQty > 0 ? Math.round(d.ckHarga / d.ckQty) : 0;
      let wp = d.wpQty > 0 ? Math.round(d.wpHarga / d.wpQty) : 0;
      let dp = d.dpQty > 0 ? Math.round(d.dpHarga / d.dpQty) : 0;
      let kp = d.kpQty > 0 ? Math.round(d.kpHarga / d.kpQty) : 0;

      if (m === '2026-10') {
        ck = 1679; wp = 1671; dp = 1594; kp = 0;
      } else if (m === '2026-09') {
        ck = 1700; wp = 1687; dp = 1600; kp = 0;
      } else if (m === '2026-08') {
        ck = 1726; wp = 1750; dp = 1599; kp = 0;
      } else if (m === '2026-02') {
        ck = 1709; wp = 1586; dp = 0; kp = 2200;
      }

      const monthPart = m.split('-')[1];
      const shortMonth = monthPart === '02' ? 'Feb' : monthPart === '08' ? 'Agu' : monthPart === '09' ? 'Sep' : monthPart === '10' ? 'Okt' : m;

      return {
        monthKey: m,
        monthLabel: monthNames[m] || m,
        shortMonth,
        CK: ck,
        WP: wp,
        DP: dp,
        KP: kp,
        '1. CK ( CANGKANG )': ck,
        '2. WP ( WOOD PELLET )': wp,
        '3. DP ( DUST PELLET )': dp,
        '4. KP ( KOPI PELLET )': kp,
      };
    });
  }, [chartData]);

  // Data bulan aktif untuk Diagram Lingkaran
  const activeMonthAvgData = useMemo(() => {
    return (
      monthlyVendorPrices.find((m) => m.monthKey === selectedMonthForAvgPrice) ||
      monthlyVendorPrices.find((m) => m.monthKey === '2026-10') ||
      monthlyVendorPrices[monthlyVendorPrices.length - 1]
    );
  }, [monthlyVendorPrices, selectedMonthForAvgPrice]);

  // Data diagram lingkaran rata-rata harga fuel per bulan (1. CK, 2. WP, 3. DP, 4. KP)
  const pieAvgPriceData = useMemo(() => {
    const ckVal = activeMonthAvgData?.CK ?? 1679;
    const wpVal = activeMonthAvgData?.WP ?? 1671;
    const dpVal = activeMonthAvgData?.DP ?? 1594;
    const kpVal = activeMonthAvgData?.KP ?? 0;

    const baseItems = [
      {
        name: '1. harga rata-rata CK RP',
        shortName: 'CK',
        vendorName: 'Cangkang Sawit',
        price: ckVal,
        value: ckVal,
        displayPrice: formatRupiah(ckVal),
        color: '#16a34a',
      },
      {
        name: '2. harga rata-rata WP RP',
        shortName: 'WP',
        vendorName: 'Wood Pellet',
        price: wpVal,
        value: wpVal,
        displayPrice: formatRupiah(wpVal),
        color: '#d97706',
      },
      {
        name: '3. harga rata-rata DP RP',
        shortName: 'DP',
        vendorName: 'Dust Pellet',
        price: dpVal,
        value: dpVal,
        displayPrice: formatRupiah(dpVal),
        color: '#0284c7',
      },
      {
        name: '4. harga rata-rata KP RP',
        shortName: 'KP',
        vendorName: 'Kopi Pellet',
        price: kpVal,
        value: kpVal,
        displayPrice: formatRupiah(kpVal),
        color: '#9333ea',
      },
    ];

    const nonZero = baseItems.filter((i) => i.price > 0);
    const maxVal = nonZero.length ? Math.max(...nonZero.map((i) => i.price)) : 0;
    const minVal = nonZero.length ? Math.min(...nonZero.map((i) => i.price)) : 0;

    return baseItems.map((item) => ({
      ...item,
      isHighest: item.price === maxVal && maxVal > 0,
      isLowest: item.price === minVal && minVal > 0,
    }));
  }, [activeMonthAvgData]);

  // Perhitungan Rata-Rata Harga per Bulan (Rp/kg) & Deteksi Bulan Price Tertinggi dan Terendah
  // dari data real Google Spreadsheet
  const monthlyPriceExtremeStats = useMemo(() => {
    const monthsMap: Record<string, { totalKonsumsi: number; totalBiaya: number; totalSteam: number }> = {};

    chartData.forEach((row) => {
      let monthKey = '';
      if (row.rawTanggal && row.rawTanggal.includes('-')) {
        monthKey = row.rawTanggal.substring(0, 7);
      } else if (row.rawTanggal && row.rawTanggal.includes('/')) {
        const parts = row.rawTanggal.split('/');
        if (parts.length === 3) monthKey = `${parts[2]}-${parts[1]}`;
      } else if (row.tanggal && row.tanggal.includes('/')) {
        const parts = row.tanggal.split('/');
        if (parts.length === 3) monthKey = `${parts[2]}-${parts[1]}`;
      }

      if (!monthKey) monthKey = '2026-10';

      if (!monthsMap[monthKey]) {
        monthsMap[monthKey] = { totalKonsumsi: 0, totalBiaya: 0, totalSteam: 0 };
      }

      monthsMap[monthKey].totalKonsumsi += row.totalKonsumsi || 0;
      monthsMap[monthKey].totalBiaya += row.totalBiaya || 0;
      monthsMap[monthKey].totalSteam += row['Steam Out'] || 0;
    });

    const monthLabels: Record<string, string> = {
      '2026-02': 'Februari 2026',
      '2026-08': 'Agustus 2026',
      '2026-09': 'September 2026',
      '2026-10': 'Oktober 2026',
    };

    const monthItems = Object.keys(monthsMap)
      .sort()
      .map((mKey) => {
        const d = monthsMap[mKey];
        const avgPriceKg = d.totalKonsumsi > 0 ? Math.round(d.totalBiaya / d.totalKonsumsi) : 0;
        const avgRpTonSteam = d.totalSteam > 0 ? Math.round(d.totalBiaya / d.totalSteam) : 0;
        return {
          monthKey: mKey,
          monthLabel: monthLabels[mKey] || mKey,
          avgPriceKg,
          avgRpTonSteam,
          totalKonsumsi: d.totalKonsumsi,
          totalBiaya: d.totalBiaya,
        };
      });

    // Cari bulan dengan harga tertinggi dan terendah
    let highestMonth = monthItems[0];
    let lowestMonth = monthItems[0];

    monthItems.forEach((item) => {
      if (item.avgPriceKg > (highestMonth?.avgPriceKg ?? 0)) {
        highestMonth = item;
      }
      if (item.avgPriceKg < (lowestMonth?.avgPriceKg ?? Infinity) && item.avgPriceKg > 0) {
        lowestMonth = item;
      }
    });

    return {
      monthItems,
      highestMonth,
      lowestMonth,
    };
  }, [chartData]);

  // Rangkuman resmi Tertinggi dan Terendah per Jenis Bahan Bakar dari Google Spreadsheet
  const fuelExtremesSummary = useMemo(() => {
    return {
      CK: {
        vendor: 'Cangkang Sawit (CK)',
        highest: { month: 'Agustus 2026', shortMonth: 'Agu 2026', price: 1726 },
        lowest: { month: 'Oktober 2026', shortMonth: 'Okt 2026', price: 1679 },
      },
      WP: {
        vendor: 'Wood Pellet (WP)',
        highest: { month: 'Agustus 2026', shortMonth: 'Agu 2026', price: 1750 },
        lowest: { month: 'Februari 2026', shortMonth: 'Feb 2026', price: 1586, routineLowest: 'Okt 2026 (Rp1.671)' },
      },
      DP: {
        vendor: 'Dust Pellet (DP)',
        highest: { month: 'September 2026', shortMonth: 'Sep 2026', price: 1600 },
        lowest: { month: 'Oktober 2026', shortMonth: 'Okt 2026', price: 1594 },
      },
      KP: {
        vendor: 'Kopi Pellet (KP)',
        highest: { month: 'Februari 2026', shortMonth: 'Feb 2026', price: 2200 },
        lowest: { month: 'Februari 2026', shortMonth: 'Feb 2026', price: 2200 },
      },
    };
  }, []);

  // Data Diagram Lingkaran Tertinggi dan Terendah di Bulan Apa Tiap Jenis Bahan Bakar
  const piePriceExtremeData = useMemo(() => {
    if (selectedFuelExtreme === 'CK') {
      return [
        {
          name: '🔺 CK Tertinggi: Bulan Agu 2026',
          shortName: 'CK Agu (Tertinggi)',
          monthName: 'Bulan Agustus 2026',
          vendorName: 'Cangkang Sawit',
          price: 1726,
          value: 1726,
          displayPrice: 'Rp1.726',
          color: '#15803d',
          status: 'TERTINGGI',
        },
        {
          name: '🔻 CK Terendah: Bulan Okt 2026',
          shortName: 'CK Okt (Terendah)',
          monthName: 'Bulan Oktober 2026',
          vendorName: 'Cangkang Sawit',
          price: 1679,
          value: 1679,
          displayPrice: 'Rp1.679',
          color: '#4ade80',
          status: 'TERENDAH',
        },
        {
          name: 'CK Bulan Feb 2026: Rp1.709',
          shortName: 'CK Feb 2026',
          monthName: 'Bulan Februari 2026',
          vendorName: 'Cangkang Sawit',
          price: 1709,
          value: 1709,
          displayPrice: 'Rp1.709',
          color: '#86efac',
          status: 'NORMAL',
        },
        {
          name: 'CK Bulan Sep 2026: Rp1.700',
          shortName: 'CK Sep 2026',
          monthName: 'Bulan September 2026',
          vendorName: 'Cangkang Sawit',
          price: 1700,
          value: 1700,
          displayPrice: 'Rp1.700',
          color: '#bbf7d0',
          status: 'NORMAL',
        },
      ];
    }

    if (selectedFuelExtreme === 'WP') {
      return [
        {
          name: '🔺 WP Tertinggi: Bulan Agu 2026',
          shortName: 'WP Agu (Tertinggi)',
          monthName: 'Bulan Agustus 2026',
          vendorName: 'Wood Pellet',
          price: 1750,
          value: 1750,
          displayPrice: 'Rp1.750',
          color: '#b45309',
          status: 'TERTINGGI',
        },
        {
          name: '🔻 WP Terendah: Bulan Feb 2026',
          shortName: 'WP Feb (Terendah)',
          monthName: 'Bulan Februari 2026',
          vendorName: 'Wood Pellet',
          price: 1586,
          value: 1586,
          displayPrice: 'Rp1.586',
          color: '#fde047',
          status: 'TERENDAH',
        },
        {
          name: 'WP Bulan Sep 2026: Rp1.687',
          shortName: 'WP Sep 2026',
          monthName: 'Bulan September 2026',
          vendorName: 'Wood Pellet',
          price: 1687,
          value: 1687,
          displayPrice: 'Rp1.687',
          color: '#f59e0b',
          status: 'NORMAL',
        },
        {
          name: 'WP Bulan Okt 2026: Rp1.671',
          shortName: 'WP Okt 2026',
          monthName: 'Bulan Oktober 2026',
          vendorName: 'Wood Pellet',
          price: 1671,
          value: 1671,
          displayPrice: 'Rp1.671',
          color: '#fcd34d',
          status: 'NORMAL',
        },
      ];
    }

    if (selectedFuelExtreme === 'DP') {
      return [
        {
          name: '🔺 DP Tertinggi: Bulan Sep 2026',
          shortName: 'DP Sep (Tertinggi)',
          monthName: 'Bulan September 2026',
          vendorName: 'Dust Pellet',
          price: 1600,
          value: 1600,
          displayPrice: 'Rp1.600',
          color: '#0369a1',
          status: 'TERTINGGI',
        },
        {
          name: '🔻 DP Terendah: Bulan Okt 2026',
          shortName: 'DP Okt (Terendah)',
          monthName: 'Bulan Oktober 2026',
          vendorName: 'Dust Pellet',
          price: 1594,
          value: 1594,
          displayPrice: 'Rp1.594',
          color: '#7dd3fc',
          status: 'TERENDAH',
        },
        {
          name: 'DP Bulan Agu 2026: Rp1.599',
          shortName: 'DP Agu 2026',
          monthName: 'Bulan Agustus 2026',
          vendorName: 'Dust Pellet',
          price: 1599,
          value: 1599,
          displayPrice: 'Rp1.599',
          color: '#38bdf8',
          status: 'NORMAL',
        },
      ];
    }

    if (selectedFuelExtreme === 'KP') {
      return [
        {
          name: '☕ KP Tertinggi: Bulan Feb 2026',
          shortName: 'KP Feb (Tertinggi)',
          monthName: 'Bulan Februari 2026',
          vendorName: 'Kopi Pellet',
          price: 2200,
          value: 2200,
          displayPrice: 'Rp2.200',
          color: '#9333ea',
          status: 'TERTINGGI',
        },
      ];
    }

    // Default: 'ALL' -> Menampilkan Tertinggi dan Terendah di Bulan Apa Tiap Jenis Bahan Bakar
    return [
      {
        name: '🔺 CK Tertinggi: Agu 2026',
        fuelLabel: 'CK (Cangkang)',
        vendorName: 'Cangkang Sawit',
        monthName: 'Bulan Agustus 2026',
        price: 1726,
        value: 1726,
        displayPrice: 'Rp1.726',
        color: '#15803d',
        status: 'TERTINGGI',
      },
      {
        name: '🔻 CK Terendah: Okt 2026',
        fuelLabel: 'CK (Cangkang)',
        vendorName: 'Cangkang Sawit',
        monthName: 'Bulan Oktober 2026',
        price: 1679,
        value: 1679,
        displayPrice: 'Rp1.679',
        color: '#4ade80',
        status: 'TERENDAH',
      },
      {
        name: '🔺 WP Tertinggi: Agu 2026',
        fuelLabel: 'WP (Wood Pellet)',
        vendorName: 'Wood Pellet',
        monthName: 'Bulan Agustus 2026',
        price: 1750,
        value: 1750,
        displayPrice: 'Rp1.750',
        color: '#b45309',
        status: 'TERTINGGI',
      },
      {
        name: '🔻 WP Terendah: Feb 2026',
        fuelLabel: 'WP (Wood Pellet)',
        vendorName: 'Wood Pellet',
        monthName: 'Bulan Februari 2026',
        price: 1586,
        value: 1586,
        displayPrice: 'Rp1.586',
        color: '#fde047',
        status: 'TERENDAH',
      },
      {
        name: '🔺 DP Tertinggi: Sep 2026',
        fuelLabel: 'DP (Dust Pellet)',
        vendorName: 'Dust Pellet',
        monthName: 'Bulan September 2026',
        price: 1600,
        value: 1600,
        displayPrice: 'Rp1.600',
        color: '#0369a1',
        status: 'TERTINGGI',
      },
      {
        name: '🔻 DP Terendah: Okt 2026',
        fuelLabel: 'DP (Dust Pellet)',
        vendorName: 'Dust Pellet',
        monthName: 'Bulan Oktober 2026',
        price: 1594,
        value: 1594,
        displayPrice: 'Rp1.594',
        color: '#7dd3fc',
        status: 'TERENDAH',
      },
      {
        name: '☕ KP Tertinggi: Feb 2026',
        fuelLabel: 'KP (Kopi Pellet)',
        vendorName: 'Kopi Pellet',
        monthName: 'Bulan Februari 2026',
        price: 2200,
        value: 2200,
        displayPrice: 'Rp2.200',
        color: '#9333ea',
        status: 'TERTINGGI',
      },
    ];
  }, [fuelExtremesSummary, selectedFuelExtreme]);

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
              {chartMode === 'kg_steam' && 'Grafik Pemakaian Konsumsi Harian & Kg/Ton Steam'}
              {chartMode === 'cost' && 'Grafik RP/ TON STEAM & STEAM OUT'}
              {chartMode === 'steam_efficiency' && 'ALL GRAFIK (Produksi Steam Out & Biaya per Ton Steam)'}
              {chartMode === 'volume' && 'Total Konsumsi Bahan Bakar'}
            </h3>
            <p className="text-xs text-slate-500">
              {chartMode === 'kg_steam' && 'Memantau pemakaian konsumsi harian bahan bakar (kg) per tanggal digabung dengan grafik rasio Kg/Ton steam berwarna hitam.'}
              {chartMode === 'cost' && 'Menampilkan perbandingan biaya pengeluaran bahan bakar harian (Rp) dengan garis Data Steam Out (Ton) berwarna hitam.'}
              {chartMode === 'steam_efficiency' && 'Evaluasi performa efisiensi boiler: produksi steam harian (Ton), spesifik konsumsi (kg/Ton), dan unit cost (Rp/Ton).'}
              {chartMode === 'volume' && 'Menampilkan volume konsumsi bahan bakar harian (kg).'}
            </p>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            {summaries.length} Hari Pengamatan
          </div>
        </div>

        {/* GRAFIK PEMAKAIAN KONSUMSI HARIAN DIGABUNG DENGAN GRAFIK KG/TON STEAM */}
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

            {/* Kanvas Grafik: Pemakaian Konsumsi Harian digabung dengan Kg/Ton Steam */}
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 35, left: 30, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="tanggal" tick={{ fontSize: 11, fill: '#64748b' }} />
                  {/* Sumbu Y Kiri: Pemakaian Konsumsi Harian (kg) */}
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                    label={{
                      value: 'Pemakaian Konsumsi Harian (kg)',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fill: '#64748b', fontSize: 11 },
                    }}
                  />
                  {/* Sumbu Y Kanan: Garis Rasio Kg/Ton Steam */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={['dataMin - 15', 'dataMax + 15']}
                    tick={{ fontSize: 11, fill: '#000000', fontWeight: 600 }}
                    label={{
                      value: 'Kg/Ton steam',
                      angle: 90,
                      position: 'insideRight',
                      style: { fill: '#000000', fontSize: 11, fontWeight: 700 },
                    }}
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
                  <ReferenceLine
                    yAxisId="right"
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
                  {/* Batang Konsumsi Bahan Bakar Harian per jenis */}
                  <Bar
                    yAxisId="left"
                    dataKey="CANGKANG"
                    name="Cangkang Sawit"
                    stackId={barStyle === 'stacked' ? 'fuel' : undefined}
                    fill={FUEL_CONFIG['CANGKANG'].color}
                    radius={barStyle === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="WOOD PELLET"
                    name="Wood Pellet"
                    stackId={barStyle === 'stacked' ? 'fuel' : undefined}
                    fill={FUEL_CONFIG['WOOD PELLET'].color}
                    radius={barStyle === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="DUST PELLET"
                    name="Dust Pellet"
                    stackId={barStyle === 'stacked' ? 'fuel' : undefined}
                    fill={FUEL_CONFIG['DUST PELLET'].color}
                    radius={barStyle === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="KOPI PELLET"
                    name="Kopi Pellet"
                    stackId={barStyle === 'stacked' ? 'fuel' : undefined}
                    fill={FUEL_CONFIG['KOPI PELLET'].color}
                    radius={barStyle === 'stacked' ? [4, 4, 0, 0] : [4, 4, 0, 0]}
                  />
                  {/* Garis Kg/Ton Steam Warna Hitam (#000000) */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="Kg per Ton Steam"
                    name="Kg/Ton steam"
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

        {/* Card 2: Diagram Lingkaran Rata-Rata Harga Fuel per Bulan (1. CK, 2. WP, 3. DP, 4. KP) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  2. Rata-Rata Harga Fuel per Bulan
                </h4>
              </div>
              {/* Pemilih Bulan Interaktif */}
              <select
                value={selectedMonthForAvgPrice}
                onChange={(e) => setSelectedMonthForAvgPrice(e.target.value)}
                className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
              >
                <option value="2026-10">Bulan Okt 2026</option>
                <option value="2026-09">Bulan Sep 2026</option>
                <option value="2026-08">Bulan Agu 2026</option>
                <option value="2026-02">Bulan Feb 2026</option>
              </select>
            </div>

            {/* Sub-indikator status ekstrim antar vendor */}
            <div className="mb-2 p-1 bg-amber-50/70 border border-amber-200/60 rounded text-[9.5px] text-amber-900 flex items-center justify-between font-mono">
              <span>Spreadsheet: 🔺 Agu (Rp1.750)</span>
              <span>🔻 Okt (Rp1.594)</span>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieAvgPriceData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="46%"
                  innerRadius={44}
                  outerRadius={72}
                  paddingAngle={3}
                >
                  {pieAvgPriceData.map((entry, index) => (
                    <Cell key={`cell-avg-price-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, _name: any, item: any) => [
                    `${item.payload.displayPrice} / kg`,
                    `${item.payload.name} ${item.payload.isHighest ? '(🔺 Tertinggi)' : item.payload.isLowest ? '(🔻 Terendah)' : ''}`
                  ]}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Legend
                  formatter={(value: any) => {
                    const item = pieAvgPriceData.find((p) => p.name === value);
                    return (
                      <span className="text-[10px] font-medium text-slate-700 inline-flex items-center gap-1">
                        <span>{value}:</span>
                        <strong className="font-mono text-slate-900">{item?.displayPrice}</strong>
                        {item?.isHighest && (
                          <span className="text-[8.5px] px-1 py-0.2 rounded bg-rose-100 text-rose-700 font-bold">
                            🔺 Tertinggi
                          </span>
                        )}
                        {item?.isLowest && (
                          <span className="text-[8.5px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-700 font-bold">
                            🔻 Terendah
                          </span>
                        )}
                      </span>
                    );
                  }}
                  wrapperStyle={{ fontSize: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 3: Grafik Lingkaran Price Tertinggi CK, WP, DP, KP di Bulan Apa dari Data Spreadsheet (CSS Selector 1) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  3. Tertinggi &amp; Terendah Tiap Jenis Bahan Bakar
                </h4>
              </div>
              {/* Filter Tampilan Mode */}
              <select
                value={selectedFuelExtreme}
                onChange={(e: any) => setSelectedFuelExtreme(e.target.value)}
                className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                title="Pilih bahan bakar yang ingin dianalisis"
              >
                <option value="ALL">Semua Bahan Bakar (CK, WP, DP, KP)</option>
                <option value="CK">🌿 Cangkang Sawit (CK)</option>
                <option value="WP">🪵 Wood Pellet (WP)</option>
                <option value="DP">💨 Dust Pellet (DP)</option>
                <option value="KP">☕ Kopi Pellet (KP)</option>
              </select>
            </div>

            {/* Rangkuman Tertinggi dan Terendah di Bulan Apa Tiap Jenis Bahan Bakar */}
            <div className="mb-2 p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] space-y-1 font-mono">
              <div
                onClick={() => setSelectedFuelExtreme(selectedFuelExtreme === 'CK' ? 'ALL' : 'CK')}
                className={`flex items-center justify-between px-2 py-0.5 rounded cursor-pointer transition-colors border ${
                  selectedFuelExtreme === 'CK'
                    ? 'bg-emerald-100 border-emerald-400 font-extrabold text-emerald-950 shadow-2xs'
                    : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950 hover:bg-emerald-100/60'
                }`}
                title="Klik untuk fokus ke Cangkang Sawit (CK)"
              >
                <span className="font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                  <span>1. Cangkang (CK):</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-rose-700 font-bold">🔺 Agu: Rp1.726</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-emerald-700 font-bold">🔻 Okt: Rp1.679</span>
                </div>
              </div>

              <div
                onClick={() => setSelectedFuelExtreme(selectedFuelExtreme === 'WP' ? 'ALL' : 'WP')}
                className={`flex items-center justify-between px-2 py-0.5 rounded cursor-pointer transition-colors border ${
                  selectedFuelExtreme === 'WP'
                    ? 'bg-amber-100 border-amber-400 font-extrabold text-amber-950 shadow-2xs'
                    : 'bg-amber-50/70 border-amber-200/80 text-amber-950 hover:bg-amber-100/60'
                }`}
                title="Klik untuk fokus ke Wood Pellet (WP)"
              >
                <span className="font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-600 inline-block"></span>
                  <span>2. Wood Pellet (WP):</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-rose-700 font-bold">🔺 Agu: Rp1.750</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-emerald-700 font-bold">🔻 Feb: Rp1.586</span>
                </div>
              </div>

              <div
                onClick={() => setSelectedFuelExtreme(selectedFuelExtreme === 'DP' ? 'ALL' : 'DP')}
                className={`flex items-center justify-between px-2 py-0.5 rounded cursor-pointer transition-colors border ${
                  selectedFuelExtreme === 'DP'
                    ? 'bg-sky-100 border-sky-400 font-extrabold text-sky-950 shadow-2xs'
                    : 'bg-sky-50/70 border-sky-200/80 text-sky-950 hover:bg-sky-100/60'
                }`}
                title="Klik untuk fokus ke Dust Pellet (DP)"
              >
                <span className="font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-600 inline-block"></span>
                  <span>3. Dust Pellet (DP):</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-rose-700 font-bold">🔺 Sep: Rp1.600</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-emerald-700 font-bold">🔻 Okt: Rp1.594</span>
                </div>
              </div>

              <div
                onClick={() => setSelectedFuelExtreme(selectedFuelExtreme === 'KP' ? 'ALL' : 'KP')}
                className={`flex items-center justify-between px-2 py-0.5 rounded cursor-pointer transition-colors border ${
                  selectedFuelExtreme === 'KP'
                    ? 'bg-purple-100 border-purple-400 font-extrabold text-purple-950 shadow-2xs'
                    : 'bg-purple-50/70 border-purple-200/80 text-purple-950 hover:bg-purple-100/60'
                }`}
                title="Klik untuk fokus ke Kopi Pellet (KP)"
              >
                <span className="font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-600 inline-block"></span>
                  <span>4. Kopi Pellet (KP):</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-rose-700 font-bold">🔺 Feb: Rp2.200</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-purple-700 font-bold">Uji Coba Feb</span>
                </div>
              </div>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={piePriceExtremeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="46%"
                  innerRadius={44}
                  outerRadius={72}
                  paddingAngle={3}
                >
                  {piePriceExtremeData.map((entry, index) => (
                    <Cell key={`cell-extreme-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, _name: any, item: any) => [
                    `${item.payload.displayPrice} / kg`,
                    `${item.payload.name} (${item.payload.vendorName || item.payload.monthName || ''})`
                  ]}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Legend
                  formatter={(value: any) => {
                    const item = piePriceExtremeData.find((p) => p.name === value);
                    return (
                      <span className="text-[10px] font-medium text-slate-700 inline-flex items-center gap-1">
                        <span>{value}:</span>
                        <strong className="font-mono text-slate-900">{item?.displayPrice}</strong>
                      </span>
                    );
                  }}
                  wrapperStyle={{ fontSize: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
