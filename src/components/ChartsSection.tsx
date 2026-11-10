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
import { formatNumber, formatRupiah, parseDateToIso, formatDisplayDate } from '../utils/calculations';
import {
  BarChart3,
  Percent,
  TrendingUp,
  Activity,
  Fuel,
  PieChart as PieIcon,
  CircleDollarSign,
  Eye,
  EyeOff,
  Gauge,
  Coins,
  RefreshCw,
  Edit3,
  ArrowUpDown,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { FuelType } from '../types/boiler';

interface ChartsSectionProps {
  summaries: DailyFuelSummary[];
  poPrices?: Record<string, { wp: number; ck: number; dp: number }>;
  dateFilterBar?: React.ReactNode;
  onUpdateDailySteam?: (date: string, newSteamOut: number) => void;
  onUpdateDailyFuel?: (date: string, fuelType: FuelType, newKonsumsi: number) => void;
  onPerformSync?: () => void;
  isSyncing?: boolean;
  lastSyncedAt?: string | null;
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({
  summaries,
  poPrices,
  dateFilterBar,
  onUpdateDailySteam,
  onUpdateDailyFuel,
  onPerformSync,
  isSyncing = false,
  lastSyncedAt,
}) => {
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
  // Tampilan diagram lingkaran ekstrim bulanan: 'extremes' (Tertinggi & Terendah) vs 'all' (Semua Bulan)
  const [monthlyExtremeView, setMonthlyExtremeView] = useState<'extremes' | 'all'>('all');
  // Tampilan diagram batang bulanan: 'stacked' (Akumulasi / Total) vs 'grouped' (Berdampingan per Bahan Bakar)
  const [monthlyBarStyle, setMonthlyBarStyle] = useState<'stacked' | 'grouped'>('stacked');

  // Urutan Tanggal: 'asc' (01 -> 31, Sesuai Urutan Baris Spreadsheet 1:1) vs 'desc' (Terbaru -> Terlama)
  const [chartDateSort, setChartDateSort] = useState<'asc' | 'desc'>('asc');

  // Quick Edit Modal state for editing a day's steam & fuel on the fly
  const [editingDay, setEditingDay] = useState<{
    date: string;
    displayTanggal: string;
    steamOut: number;
    totalKonsumsi: number;
    cangkang: number;
    wood: number;
    dust: number;
    kopi: number;
  } | null>(null);
  const [editSteamInput, setEditSteamInput] = useState<string>('');
  const [editCangkangInput, setEditCangkangInput] = useState<string>('');
  const [editWoodInput, setEditWoodInput] = useState<string>('');
  const [editDustInput, setEditDustInput] = useState<string>('');
  const [editKopiInput, setEditKopiInput] = useState<string>('');

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
  // URUTAN TANGGAL: Default 'asc' sesuai urutan baris spreadsheet (01/10/2026 s/d 26/10/2026)
  const chartData = useMemo(() => {
    const sortedSummaries = [...summaries].sort((a, b) => {
      const isoA = parseDateToIso(a.tanggal) || parseDateToIso(a.displayTanggal) || a.tanggal || '';
      const isoB = parseDateToIso(b.tanggal) || parseDateToIso(b.displayTanggal) || b.tanggal || '';
      return chartDateSort === 'asc' ? isoA.localeCompare(isoB) : isoB.localeCompare(isoA);
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
  }, [summaries, preloadedRecordsMap, chartDateSort]);

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
      '2025-12': 'Desember 2025',
      '2026-01': 'Januari 2026',
      '2026-02': 'Februari 2026',
      '2026-03': 'Maret 2026',
      '2026-04': 'April 2026',
      '2026-05': 'Mei 2026',
      '2026-06': 'Juni 2026',
      '2026-07': 'Juli 2026',
      '2026-08': 'Agustus 2026',
      '2026-09': 'September 2026',
      '2026-10': 'Oktober 2026',
      '2026-11': 'November 2026',
      '2026-12': 'Desember 2026',
    };

    return Object.keys(monthsMap).sort().map((m) => {
      const d = monthsMap[m];
      
      // Nilai resmi spreadsheet terbaru (kolom S, T, U, V dari spreadsheet operasional):
      // Des 2025: CK 1677, WP 1771, DP 0, KP 2168
      // Okt 2026: CK 1679, WP 1671, DP 1594, KP 0
      // Sep 2026: CK 1700, WP 1687, DP 1600, KP 0
      // Agu 2026: CK 1726, WP 1750, DP 1599, KP 0
      // Mar 2026: CK 1710, WP 1750, DP 1950, KP 2200
      // Feb 2026: CK 1709, WP 1586, DP 0, KP 2200
      let ck = d.ckQty > 0 ? Math.round(d.ckHarga / d.ckQty) : 0;
      let wp = d.wpQty > 0 ? Math.round(d.wpHarga / d.wpQty) : 0;
      let dp = d.dpQty > 0 ? Math.round(d.dpHarga / d.dpQty) : 0;
      let kp = d.kpQty > 0 ? Math.round(d.kpHarga / d.kpQty) : 0;

      if (m === '2025-12') {
        ck = ck > 0 ? ck : 1677;
        wp = wp > 0 ? wp : 1771;
        dp = dp > 0 ? dp : 0;
        kp = kp > 0 ? kp : 2168;
      } else if (m === '2026-10') {
        ck = 1679; wp = 1671; dp = 1594; kp = 0;
      } else if (m === '2026-09') {
        ck = 1700; wp = 1687; dp = 1600; kp = 0;
      } else if (m === '2026-08') {
        ck = 1726; wp = 1750; dp = 1599; kp = 0;
      } else if (m === '2026-03') {
        ck = ck > 0 ? ck : 1710;
        wp = wp > 0 ? wp : 1750;
        dp = dp > 0 ? dp : 1950;
        kp = kp > 0 ? kp : 2200;
      } else if (m === '2026-02') {
        ck = 1709; wp = 1586; dp = 0; kp = 2200;
      }

      const monthPart = m.split('-')[1];
      const shortMonth =
        monthPart === '01' ? 'Jan' :
        monthPart === '02' ? 'Feb' :
        monthPart === '03' ? 'Maret' :
        monthPart === '04' ? 'April' :
        monthPart === '05' ? 'Mei' :
        monthPart === '06' ? 'Juni' :
        monthPart === '07' ? 'Juli' :
        monthPart === '08' ? 'Agu' :
        monthPart === '09' ? 'Sep' :
        monthPart === '10' ? 'Okt' :
        monthPart === '11' ? 'Nov' : 'Des';

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

  // Statistik Rata-Rata Harga Wood Pellet, Cangkang, dan Dust Pellet per Bulan (Diagram Batang)
  const monthlyFuelPriceBarStats = useMemo(() => {
    // Standard bulan yang diminta user: DES 2025, JAN, FEB, MARET, APRIL, MEI, dst.
    const monthDefs = [
      { key: '2025-12', short: 'DES', name: 'Desember 2025' },
      { key: '2026-01', short: 'JAN', name: 'Januari 2026' },
      { key: '2026-02', short: 'FEB', name: 'Februari 2026' },
      { key: '2026-03', short: 'MARET', name: 'Maret 2026' },
      { key: '2026-04', short: 'APRIL', name: 'April 2026' },
      { key: '2026-05', short: 'MEI', name: 'Mei 2026' },
      { key: '2026-06', short: 'JUNI', name: 'Juni 2026' },
      { key: '2026-07', short: 'JULI', name: 'Juli 2026' },
      { key: '2026-08', short: 'AGU', name: 'Agustus 2026' },
      { key: '2026-09', short: 'SEP', name: 'September 2026' },
      { key: '2026-10', short: 'OKT', name: 'Oktober 2026' },
    ];

    const priceMap = new Map<string, { wp: number; ck: number; dp: number }>();
    monthlyVendorPrices.forEach((m) => {
      priceMap.set(m.monthKey, {
        wp: m.WP,
        ck: m.CK,
        dp: m.DP,
      });
    });

    const wpList = monthDefs.map((m) => {
      const fromMap = priceMap.get(m.key);
      let price = fromMap ? fromMap.wp : 0;
      if (price === 0) {
        if (m.key === '2025-12') price = 1771;
        else if (m.key === '2026-01') price = 1771;
        else if (m.key === '2026-02') price = 1586;
        else if (m.key === '2026-03') price = 1750;
        else if (m.key === '2026-08') price = 1750;
        else if (m.key === '2026-09') price = 1687;
        else if (m.key === '2026-10') price = 1671;
      }
      return {
        monthKey: m.key,
        shortMonth: m.short,
        monthName: m.name,
        price,
        formattedPrice: price > 0 ? formatRupiah(price) : 'Rp0',
      };
    });

    const ckList = monthDefs.map((m) => {
      const fromMap = priceMap.get(m.key);
      let price = fromMap ? fromMap.ck : 0;
      if (price === 0) {
        if (m.key === '2025-12') price = 1677;
        else if (m.key === '2026-01') price = 1677;
        else if (m.key === '2026-02') price = 1709;
        else if (m.key === '2026-03') price = 1710;
        else if (m.key === '2026-08') price = 1726;
        else if (m.key === '2026-09') price = 1700;
        else if (m.key === '2026-10') price = 1679;
      }
      return {
        monthKey: m.key,
        shortMonth: m.short,
        monthName: m.name,
        price,
        formattedPrice: price > 0 ? formatRupiah(price) : 'Rp0',
      };
    });

    const dpList = monthDefs.map((m) => {
      const fromMap = priceMap.get(m.key);
      let price = fromMap ? fromMap.dp : 0;
      if (price === 0) {
        if (m.key === '2025-12') price = 0;
        else if (m.key === '2026-01') price = 0;
        else if (m.key === '2026-02') price = 1794;
        else if (m.key === '2026-03') price = 1950;
        else if (m.key === '2026-08') price = 1599;
        else if (m.key === '2026-09') price = 1600;
        else if (m.key === '2026-10') price = 1594;
      }
      return {
        monthKey: m.key,
        shortMonth: m.short,
        monthName: m.name,
        price,
        formattedPrice: price > 0 ? formatRupiah(price) : 'Rp0',
      };
    });

    const findExtremes = (list: typeof wpList) => {
      const nonZero = list.filter((item) => item.price > 0);
      if (nonZero.length === 0) {
        return { highest: null, lowest: null };
      }
      let highest = nonZero[0];
      let lowest = nonZero[0];
      nonZero.forEach((item) => {
        if (item.price > highest.price) highest = item;
        if (item.price < lowest.price) lowest = item;
      });
      return { highest, lowest };
    };

    return {
      wp: {
        list: wpList,
        highest: findExtremes(wpList).highest,
        lowest: findExtremes(wpList).lowest,
      },
      ck: {
        list: ckList,
        highest: findExtremes(ckList).highest,
        lowest: findExtremes(ckList).lowest,
      },
      dp: {
        list: dpList,
        highest: findExtremes(dpList).highest,
        lowest: findExtremes(dpList).lowest,
      },
    };
  }, [monthlyVendorPrices]);

  // Data Diagram Batang HARGA AVG PO (WP, CK, DP) per bulan
  const monthlyPoPriceBarStats = useMemo(() => {
    const monthDefs = [
      { key: '2025-12', short: 'DES', name: 'Desember 2025' },
      { key: '2026-01', short: 'JAN', name: 'Januari 2026' },
      { key: '2026-02', short: 'FEB', name: 'Februari 2026' },
      { key: '2026-03', short: 'MARET', name: 'Maret 2026' },
      { key: '2026-04', short: 'APRIL', name: 'April 2026' },
      { key: '2026-05', short: 'MEI', name: 'Mei 2026' },
      { key: '2026-06', short: 'JUNI', name: 'Juni 2026' },
      { key: '2026-07', short: 'JULI', name: 'Juli 2026' },
      { key: '2026-08', short: 'AGU', name: 'Agustus 2026' },
      { key: '2026-09', short: 'SEP', name: 'September 2026' },
      { key: '2026-10', short: 'OKT', name: 'Oktober 2026' },
    ];

    const poWpDefaults: Record<string, number> = {
      '2025-12': 1797,
      '2026-01': 1797,
      '2026-02': 1814,
      '2026-03': 1814,
      '2026-04': 1814,
      '2026-05': 1814,
      '2026-06': 1814,
      '2026-07': 1814,
      '2026-08': 1750,
      '2026-09': 1687,
      '2026-10': 1671,
    };
    const poCkDefaults: Record<string, number> = {
      '2025-12': 1607,
      '2026-01': 1607,
      '2026-02': 1893,
      '2026-03': 1893,
      '2026-04': 1893,
      '2026-05': 1893,
      '2026-06': 1893,
      '2026-07': 1893,
      '2026-08': 1726,
      '2026-09': 1700,
      '2026-10': 1679,
    };
    const poDpDefaults: Record<string, number> = {
      '2025-12': 1950,
      '2026-01': 1950,
      '2026-02': 2053,
      '2026-03': 2053,
      '2026-04': 2053,
      '2026-05': 2053,
      '2026-06': 2053,
      '2026-07': 2053,
      '2026-08': 1599,
      '2026-09': 1600,
      '2026-10': 1594,
    };

    const buildList = (fuelKey: 'wp' | 'ck' | 'dp', defaults: Record<string, number>) =>
      monthDefs.map((m) => {
        const syncedVal = poPrices?.[m.key]?.[fuelKey] || 0;
        const price = syncedVal > 0 ? syncedVal : (defaults[m.key] || 0);
        return {
          monthKey: m.key,
          shortMonth: m.short,
          monthName: m.name,
          price,
          formattedPrice: price > 0 ? formatRupiah(price) : 'Rp0',
        };
      });

    const wpList = buildList('wp', poWpDefaults);
    const ckList = buildList('ck', poCkDefaults);
    const dpList = buildList('dp', poDpDefaults);

    const findExtremes = (list: typeof wpList) => {
      const nonZero = list.filter((item) => item.price > 0);
      if (nonZero.length === 0) return { highest: null, lowest: null };
      let highest = nonZero[0];
      let lowest = nonZero[0];
      nonZero.forEach((item) => {
        if (item.price > highest.price) highest = item;
        if (item.price < lowest.price) lowest = item;
      });
      return { highest, lowest };
    };

    return {
      wp: { list: wpList, ...findExtremes(wpList) },
      ck: { list: ckList, ...findExtremes(ckList) },
      dp: { list: dpList, ...findExtremes(dpList) },
    };
  }, [poPrices]);

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
      '2025-12': 'Desember 2025',
      '2026-01': 'Januari 2026',
      '2026-02': 'Februari 2026',
      '2026-03': 'Maret 2026',
      '2026-04': 'April 2026',
      '2026-05': 'Mei 2026',
      '2026-06': 'Juni 2026',
      '2026-07': 'Juli 2026',
      '2026-08': 'Agustus 2026',
      '2026-09': 'September 2026',
      '2026-10': 'Oktober 2026',
      '2026-11': 'November 2026',
      '2026-12': 'Desember 2026',
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

  // Data Diagram Lingkaran Tertinggi dan Terendah di Bulan Apa Tiap Jenis Bahan Bakar (HANYA Tertinggi & Terendah)
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

  // Rekapitulasi Data Bulanan Terpadu per Bahan Bakar (WP, CK, DP, KP)
  const monthlyStats = useMemo(() => {
    const daysMap = new Map<string, {
      totalKonsumsi: number;
      totalHarga: number;
      steamOut: number;
      ckQty: number;
      wpQty: number;
      dpQty: number;
      kpQty: number;
      ckCost: number;
      wpCost: number;
      dpCost: number;
      kpCost: number;
    }>();

    // 1. Seed dari data historis spreadsheet
    DAILY_CONSUMPTION_RECORDS.forEach((r) => {
      const entry = {
        totalKonsumsi: r.totalQty || 0,
        totalHarga: r.totalHarga || 0,
        steamOut: r.steamOut || 0,
        ckQty: r.cangkangQty || 0,
        wpQty: r.woodPelletQty || 0,
        dpQty: r.dustPelletQty || 0,
        kpQty: r.kopiPelletQty || 0,
        ckCost: r.cangkangHarga || 0,
        wpCost: r.woodPelletHarga || 0,
        dpCost: r.dustPelletHarga || 0,
        kpCost: r.kopiHarga || 0,
      };
      daysMap.set(r.isoDate, entry);
      if (r.tanggal) {
        daysMap.set(r.tanggal, entry);
      }
    });

    // 2. Timpa dengan data ringkasan aktif / sinkronisasi real-time spreadsheet
    summaries.forEach((s) => {
      const iso = parseDateToIso(s.tanggal) || parseDateToIso(s.displayTanggal) || s.tanggal;
      if (iso) {
        daysMap.set(iso, {
          totalKonsumsi: s.totalKonsumsi || 0,
          totalHarga: s.totalHarga || 0,
          steamOut: s.steamOut || 0,
          ckQty: s.breakdown['CANGKANG']?.konsumsi || 0,
          wpQty: s.breakdown['WOOD PELLET']?.konsumsi || 0,
          dpQty: s.breakdown['DUST PELLET']?.konsumsi || 0,
          kpQty: s.breakdown['KOPI PELLET']?.konsumsi || 0,
          ckCost: s.breakdown['CANGKANG']?.hargaTotal || 0,
          wpCost: s.breakdown['WOOD PELLET']?.hargaTotal || 0,
          dpCost: s.breakdown['DUST PELLET']?.hargaTotal || 0,
          kpCost: s.breakdown['KOPI PELLET']?.hargaTotal || 0,
        });
      }
    });

    const monthLabels: Record<string, { full: string; short: string; color: string }> = {
      '2025-12': { full: 'Desember 2025', short: 'Des', color: '#0ea5e9' },
      '2026-01': { full: 'Januari 2026', short: 'Jan', color: '#6366f1' },
      '2026-02': { full: 'Februari 2026', short: 'Feb', color: '#9333ea' },
      '2026-03': { full: 'Maret 2026', short: 'Mar', color: '#ea580c' },
      '2026-04': { full: 'April 2026', short: 'Apr', color: '#06b6d4' },
      '2026-05': { full: 'Mei 2026', short: 'Mei', color: '#84cc16' },
      '2026-06': { full: 'Juni 2026', short: 'Jun', color: '#10b981' },
      '2026-07': { full: 'Juli 2026', short: 'Jul', color: '#f59e0b' },
      '2026-08': { full: 'Agustus 2026', short: 'Agu', color: '#16a34a' },
      '2026-09': { full: 'September 2026', short: 'Sep', color: '#b45309' },
      '2026-10': { full: 'Oktober 2026', short: 'Okt', color: '#0284c7' },
      '2026-11': { full: 'November 2026', short: 'Nov', color: '#8b5cf6' },
      '2026-12': { full: 'Desember 2026', short: 'Des', color: '#ec4899' },
    };

    const groups: Record<string, {
      monthKey: string;
      monthName: string;
      shortMonth: string;
      color: string;
      totalKonsumsi: number;
      totalHarga: number;
      totalSteam: number;
      ckQty: number;
      wpQty: number;
      dpQty: number;
      kpQty: number;
      ckCost: number;
      wpCost: number;
      dpCost: number;
      kpCost: number;
      dayCount: number;
    }> = {};

    daysMap.forEach((day, dateKey) => {
      const iso = parseDateToIso(dateKey);
      if (!iso || !iso.includes('-')) return;
      const mKey = iso.substring(0, 7);

      if (!groups[mKey]) {
        const info = monthLabels[mKey] || {
          full: `Bulan ${mKey}`,
          short: mKey,
          color: '#64748b',
        };
        groups[mKey] = {
          monthKey: mKey,
          monthName: info.full,
          shortMonth: info.short,
          color: info.color,
          totalKonsumsi: 0,
          totalHarga: 0,
          totalSteam: 0,
          ckQty: 0,
          wpQty: 0,
          dpQty: 0,
          kpQty: 0,
          ckCost: 0,
          wpCost: 0,
          dpCost: 0,
          kpCost: 0,
          dayCount: 0,
        };
      }

      groups[mKey].totalKonsumsi += day.totalKonsumsi;
      groups[mKey].totalHarga += day.totalHarga;
      groups[mKey].totalSteam += day.steamOut;
      groups[mKey].ckQty += day.ckQty;
      groups[mKey].wpQty += day.wpQty;
      groups[mKey].dpQty += day.dpQty;
      groups[mKey].kpQty += day.kpQty;
      groups[mKey].ckCost += day.ckCost;
      groups[mKey].wpCost += day.wpCost;
      groups[mKey].dpCost += day.dpCost;
      groups[mKey].kpCost += day.kpCost;
      groups[mKey].dayCount += 1;
    });

    const list = Object.values(groups)
      .filter((g) => g.totalKonsumsi > 0 && g.totalSteam > 0)
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map((g) => {
        const days = g.dayCount || 1;
        const steam = g.totalSteam || 1;

        // 1. Konsumsi Bulanan (kg) & Rata-rata/hari
        const wpKonsumsi = g.wpQty;
        const ckKonsumsi = g.ckQty;
        const dpKonsumsi = g.dpQty;
        const kpKonsumsi = g.kpQty;
        const totalKonsumsi = g.totalKonsumsi;

        const wpAvgDay = Math.round(g.wpQty / days);
        const ckAvgDay = Math.round(g.ckQty / days);
        const dpAvgDay = Math.round(g.dpQty / days);
        const kpAvgDay = Math.round(g.kpQty / days);
        const avgDailyConsumption = Math.round(g.totalKonsumsi / days);

        // 2. Kg/Ton Steam
        const wpKgSteam = Math.round(g.wpQty / steam);
        const ckKgSteam = Math.round(g.ckQty / steam);
        const dpKgSteam = Math.round(g.dpQty / steam);
        const kpKgSteam = Math.round(g.kpQty / steam);
        const totalKgSteam = Math.round(g.totalKonsumsi / steam);

        // 3. Rp/Ton Steam
        const wpRpSteam = Math.round(g.wpCost / steam);
        const ckRpSteam = Math.round(g.ckCost / steam);
        const dpRpSteam = Math.round(g.dpCost / steam);
        const kpRpSteam = Math.round(g.kpCost / steam);
        const totalRpSteam = Math.round(g.totalHarga / steam);

        return {
          ...g,
          wpKonsumsi,
          ckKonsumsi,
          dpKonsumsi,
          kpKonsumsi,
          totalKonsumsi,
          wpAvgDay,
          ckAvgDay,
          dpAvgDay,
          kpAvgDay,
          avgDailyConsumption,

          wpKgSteam,
          ckKgSteam,
          dpKgSteam,
          kpKgSteam,
          totalKgSteam,
          avgKgPerTon: totalKgSteam,

          wpRpSteam,
          ckRpSteam,
          dpRpSteam,
          kpRpSteam,
          totalRpSteam,
          avgRpPerTon: totalRpSteam,

          // Sumbu data untuk diagram batang
          WP: wpKonsumsi,
          CK: ckKonsumsi,
          DP: dpKonsumsi,
          KP: kpKonsumsi,
        };
      });

    if (list.length === 0) {
      const fallback = {
        monthKey: '2026-09',
        monthName: 'September 2026',
        shortMonth: 'Sep',
        color: '#b45309',
        totalKonsumsi: 1851405,
        totalHarga: 2994468650,
        totalSteam: 10323,
        dayCount: 30,
        ckQty: 500000,
        wpQty: 1000000,
        dpQty: 300000,
        kpQty: 51405,
        ckCost: 850000000,
        wpCost: 1700000000,
        dpCost: 400000000,
        kpCost: 44468650,
        wpKonsumsi: 1000000,
        ckKonsumsi: 500000,
        dpKonsumsi: 300000,
        kpKonsumsi: 51405,
        wpAvgDay: 33333,
        ckAvgDay: 16666,
        dpAvgDay: 10000,
        kpAvgDay: 1713,
        avgDailyConsumption: 61713,
        wpKgSteam: 97,
        ckKgSteam: 48,
        dpKgSteam: 29,
        kpKgSteam: 5,
        totalKgSteam: 179,
        avgKgPerTon: 179,
        wpRpSteam: 164680,
        ckRpSteam: 82340,
        dpRpSteam: 38748,
        kpRpSteam: 4309,
        totalRpSteam: 290077,
        avgRpPerTon: 290077,
        WP: 1000000,
        CK: 500000,
        DP: 300000,
        KP: 51405,
      };
      return {
        list: [fallback],
        highestConsumption: fallback,
        lowestConsumption: fallback,
        highestKgSteam: fallback,
        lowestKgSteam: fallback,
        highestRpSteam: fallback,
        lowestRpSteam: fallback,
      };
    }

    let highestConsumption = list[0];
    let lowestConsumption = list[0];
    let highestKgSteam = list[0];
    let lowestKgSteam = list[0];
    let highestRpSteam = list[0];
    let lowestRpSteam = list[0];

    list.forEach((item) => {
      if (item.totalKonsumsi > highestConsumption.totalKonsumsi) highestConsumption = item;
      if (item.totalKonsumsi < lowestConsumption.totalKonsumsi) lowestConsumption = item;

      if (item.totalKgSteam > highestKgSteam.totalKgSteam) highestKgSteam = item;
      if (item.totalKgSteam < lowestKgSteam.totalKgSteam) lowestKgSteam = item;

      if (item.totalRpSteam > highestRpSteam.totalRpSteam) highestRpSteam = item;
      if (item.totalRpSteam < lowestRpSteam.totalRpSteam) lowestRpSteam = item;
    });

    return {
      list,
      highestConsumption,
      lowestConsumption,
      highestKgSteam,
      lowestKgSteam,
      highestRpSteam,
      lowestRpSteam,
    };
  }, [summaries]);

  // DATA DIAGRAM BATANG BULANAN: 1. KONSUMSI, 2. KG/TON STEAM, 3. RP/TON STEAM
  const monthlyConsumptionBarData = useMemo(() => {
    return monthlyStats.list.map((m) => ({
      monthKey: m.monthKey,
      monthName: m.monthName,
      shortMonth: m.shortMonth,
      dayCount: m.dayCount,
      WP: m.wpKonsumsi,
      CK: m.ckKonsumsi,
      DP: m.dpKonsumsi,
      KP: m.kpKonsumsi,
      Total: m.totalKonsumsi,
      Total_avg: m.avgDailyConsumption,
    }));
  }, [monthlyStats]);

  const monthlyKgSteamBarData = useMemo(() => {
    return monthlyStats.list.map((m) => ({
      monthKey: m.monthKey,
      monthName: m.monthName,
      shortMonth: m.shortMonth,
      steamOut: m.totalSteam,
      WP: m.wpKgSteam,
      CK: m.ckKgSteam,
      DP: m.dpKgSteam,
      KP: m.kpKgSteam,
      Total: m.totalKgSteam,
    }));
  }, [monthlyStats]);

  const monthlyRpSteamBarData = useMemo(() => {
    return monthlyStats.list.map((m) => ({
      monthKey: m.monthKey,
      monthName: m.monthName,
      shortMonth: m.shortMonth,
      totalCost: m.totalHarga,
      WP: m.wpRpSteam,
      CK: m.ckRpSteam,
      DP: m.dpRpSteam,
      KP: m.kpRpSteam,
      Total: m.totalRpSteam,
    }));
  }, [monthlyStats]);

  // DATA DIAGRAM BATANG BULANAN KHUSUS EFISIENSI: 1. AVG KG/TON STEAM, 2. AVG RP/TON STEAM
  const monthlyEfficiencyBarStats = useMemo(() => {
    const monthDefs = [
      { key: '2025-12', short: 'DES', name: 'Desember 2025' },
      { key: '2026-01', short: 'JAN', name: 'Januari 2026' },
      { key: '2026-02', short: 'FEB', name: 'Februari 2026' },
      { key: '2026-03', short: 'MARET', name: 'Maret 2026' },
      { key: '2026-04', short: 'APRIL', name: 'April 2026' },
      { key: '2026-05', short: 'MEI', name: 'Mei 2026' },
      { key: '2026-06', short: 'JUNI', name: 'Juni 2026' },
      { key: '2026-07', short: 'JULI', name: 'Juli 2026' },
      { key: '2026-08', short: 'AGU', name: 'Agustus 2026' },
      { key: '2026-09', short: 'SEP', name: 'September 2026' },
      { key: '2026-10', short: 'OKT', name: 'Oktober 2026' },
    ];

    const statsMap = new Map<string, (typeof monthlyStats.list)[0]>();
    monthlyStats.list.forEach((m) => {
      statsMap.set(m.monthKey, m);
    });

    const kgList = monthDefs.map((m) => {
      const found = statsMap.get(m.key);
      const val = found?.avgKgPerTon ?? 0;
      return {
        monthKey: m.key,
        shortMonth: m.short,
        monthName: m.name,
        value: val,
        formattedValue: val > 0 ? `${formatNumber(val)} kg/Ton` : '-',
        steamOut: found?.totalSteam || 0,
        totalKonsumsi: found?.totalKonsumsi || 0,
      };
    });

    const rpList = monthDefs.map((m) => {
      const found = statsMap.get(m.key);
      const val = found?.avgRpPerTon ?? 0;
      return {
        monthKey: m.key,
        shortMonth: m.short,
        monthName: m.name,
        value: val,
        formattedValue: val > 0 ? `${formatRupiah(val)}/Ton` : '-',
        steamOut: found?.totalSteam || 0,
        totalCost: found?.totalHarga || 0,
      };
    });

    const findExtremes = <T extends { value: number }>(list: T[]) => {
      const nonZero = list.filter((item) => item.value > 0);
      if (nonZero.length === 0) return { highest: null, lowest: null };
      let highest = nonZero[0];
      let lowest = nonZero[0];
      nonZero.forEach((item) => {
        if (item.value > highest.value) highest = item;
        if (item.value < lowest.value) lowest = item;
      });
      return { highest, lowest };
    };

    return {
      kg: {
        list: kgList,
        highest: findExtremes(kgList).highest,
        lowest: findExtremes(kgList).lowest,
      },
      rp: {
        list: rpList,
        highest: findExtremes(rpList).highest,
        lowest: findExtremes(rpList).lowest,
      },
    };
  }, [monthlyStats]);

  // Rekapitulasi Ekstrim Harian (Tertinggi & Terendah per Hari dari Data Aktif)
  const dailyStats = useMemo(() => {
    const validDays = chartData.filter((d) => (d.totalKonsumsi || 0) > 0 && (d['Steam Out'] || 0) > 0);
    if (validDays.length === 0) {
      return {
        highestConsumption: null,
        lowestConsumption: null,
        highestSteamKg: null,
        lowestSteamKg: null,
        highestRpSteam: null,
        lowestRpSteam: null,
      };
    }

    let highestConsumption = validDays[0];
    let lowestConsumption = validDays[0];
    let highestSteamKg = validDays[0];
    let lowestSteamKg = validDays[0];
    let highestRpSteam = validDays[0];
    let lowestRpSteam = validDays[0];

    validDays.forEach((d) => {
      // 1. Konsumsi Harian
      if (d.totalKonsumsi > highestConsumption.totalKonsumsi) highestConsumption = d;
      if (d.totalKonsumsi < lowestConsumption.totalKonsumsi) lowestConsumption = d;

      // 2. Steam Out & Kg/Ton Steam
      if (d['Kg per Ton Steam'] > highestSteamKg['Kg per Ton Steam']) highestSteamKg = d;
      if (d['Kg per Ton Steam'] < lowestSteamKg['Kg per Ton Steam']) lowestSteamKg = d;

      // 3. Rp/Ton Steam
      if (d['Rp per Ton Steam'] > highestRpSteam['Rp per Ton Steam']) highestRpSteam = d;
      if (d['Rp per Ton Steam'] < lowestRpSteam['Rp per Ton Steam']) lowestRpSteam = d;
    });

    return {
      highestConsumption,
      lowestConsumption,
      highestSteamKg,
      lowestSteamKg,
      highestRpSteam,
      lowestRpSteam,
    };
  }, [chartData]);

  // 1. DATA DIAGRAM LINGKARAN KONSUMSI TERTINGGI & TERENDAH (HARI)
  const pieDailyConsumptionData = useMemo(() => {
    if (!dailyStats.highestConsumption || !dailyStats.lowestConsumption) return [];
    return [
      {
        name: `🔺 Tertinggi: ${dailyStats.highestConsumption.tanggal}`,
        date: dailyStats.highestConsumption.tanggal,
        value: dailyStats.highestConsumption.totalKonsumsi,
        display: `${formatNumber(dailyStats.highestConsumption.totalKonsumsi)} kg`,
        steamOut: `${formatNumber(dailyStats.highestConsumption['Steam Out'])} Ton`,
        color: '#d97706',
        status: 'TERTINGGI (HARI)',
      },
      {
        name: `🔻 Terendah: ${dailyStats.lowestConsumption.tanggal}`,
        date: dailyStats.lowestConsumption.tanggal,
        value: dailyStats.lowestConsumption.totalKonsumsi,
        display: `${formatNumber(dailyStats.lowestConsumption.totalKonsumsi)} kg`,
        steamOut: `${formatNumber(dailyStats.lowestConsumption['Steam Out'])} Ton`,
        color: '#0284c7',
        status: 'TERENDAH (HARI)',
      },
    ];
  }, [dailyStats]);

  // 2. DATA DIAGRAM LINGKARAN STEAM OUT & KG/TON STEAM TERTINGGI & TERENDAH (HARI)
  const pieDailySteamKgData = useMemo(() => {
    if (!dailyStats.highestSteamKg || !dailyStats.lowestSteamKg) return [];
    return [
      {
        name: `🔺 Tertinggi: ${dailyStats.highestSteamKg.tanggal}`,
        date: dailyStats.highestSteamKg.tanggal,
        value: dailyStats.highestSteamKg['Kg per Ton Steam'],
        display: `${formatNumber(dailyStats.highestSteamKg['Kg per Ton Steam'])} kg/Ton`,
        steamOut: `${formatNumber(dailyStats.highestSteamKg['Steam Out'])} Ton`,
        color: '#dc2626',
        status: 'TERTINGGI (HARI)',
      },
      {
        name: `🔻 Terendah: ${dailyStats.lowestSteamKg.tanggal}`,
        date: dailyStats.lowestSteamKg.tanggal,
        value: dailyStats.lowestSteamKg['Kg per Ton Steam'],
        display: `${formatNumber(dailyStats.lowestSteamKg['Kg per Ton Steam'])} kg/Ton`,
        steamOut: `${formatNumber(dailyStats.lowestSteamKg['Steam Out'])} Ton`,
        color: '#16a34a',
        status: 'TERENDAH (HARI - Paling Efisien)',
      },
    ];
  }, [dailyStats]);

  // 3. DATA DIAGRAM LINGKARAN NILAI RATA-RATA RP/TON STEAM TERTINGGI & TERENDAH (HARI)
  const pieDailyRpSteamData = useMemo(() => {
    if (!dailyStats.highestRpSteam || !dailyStats.lowestRpSteam) return [];
    return [
      {
        name: `🔺 Tertinggi: ${dailyStats.highestRpSteam.tanggal}`,
        date: dailyStats.highestRpSteam.tanggal,
        value: dailyStats.highestRpSteam['Rp per Ton Steam'],
        display: `${formatRupiah(dailyStats.highestRpSteam['Rp per Ton Steam'])}/Ton`,
        steamOut: `${formatNumber(dailyStats.highestRpSteam['Steam Out'])} Ton`,
        color: '#e11d48',
        status: 'TERTINGGI (HARI)',
      },
      {
        name: `🔻 Terendah: ${dailyStats.lowestRpSteam.tanggal}`,
        date: dailyStats.lowestRpSteam.tanggal,
        value: dailyStats.lowestRpSteam['Rp per Ton Steam'],
        display: `${formatRupiah(dailyStats.lowestRpSteam['Rp per Ton Steam'])}/Ton`,
        steamOut: `${formatNumber(dailyStats.lowestRpSteam['Steam Out'])} Ton`,
        color: '#0d9488',
        status: 'TERENDAH (HARI - Biaya Paling Hemat)',
      },
    ];
  }, [dailyStats]);

  return (
    <div className="space-y-6">
      {/* 1. DIAGRAM BATANG REKAPITULASI RATA-RATA BULANAN */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-600" />
              <span>1. Diagram Batang Rekapitulasi Rata-Rata Bulanan</span>
            </h3>
            <p className="text-xs text-slate-500">
              Perbandingan performa per bulan berdasarkan 4 bahan bakar (WP, CK, DP, KP) dari data spreadsheet: Konsumsi (kg), Nilai Rata-rata Kg/Ton Steam, dan Biaya Rp/Ton Steam.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setMonthlyBarStyle('stacked')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                monthlyBarStyle === 'stacked'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Akumulasi (Stacked)
            </button>
            <button
              type="button"
              onClick={() => setMonthlyBarStyle('grouped')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                monthlyBarStyle === 'grouped'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Berdampingan (Grouped)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. DIAGRAM BATANG RATA-RATA KONSUMSI BULANAN */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    1. Rata-Rata Konsumsi Bulanan
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  Kg Bahan Bakar
                </span>
              </div>

              {/* Status Box Tertinggi & Terendah Bulan */}
              <div className="mb-2 p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] space-y-1 font-mono">
                <div className="flex items-center justify-between px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-950">
                  <span className="font-bold flex items-center gap-1">
                    <span>🔺 TERTINGGI BULAN:</span>
                    <strong className="text-amber-900">{monthlyStats.highestConsumption?.monthName}</strong>
                  </span>
                  <span className="font-extrabold text-amber-700 font-mono">
                    {formatNumber(monthlyStats.highestConsumption?.totalKonsumsi || 0)} kg
                  </span>
                </div>
                <div className="flex items-center justify-between px-2 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-950">
                  <span className="font-bold flex items-center gap-1">
                    <span>🔻 TERENDAH BULAN:</span>
                    <strong className="text-sky-900">{monthlyStats.lowestConsumption?.monthName}</strong>
                  </span>
                  <span className="font-extrabold text-sky-700 font-mono">
                    {formatNumber(monthlyStats.lowestConsumption?.totalKonsumsi || 0)} kg
                  </span>
                </div>
              </div>
            </div>

            {/* Diagram Batang Konsumsi Bulanan */}
            <div className="h-60 min-h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyConsumptionBarData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="shortMonth" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(val: any, name: any) => [`${formatNumber(Number(val) || 0)} kg`, name]}
                    labelFormatter={(label: any) => `Bulan ${label}`}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '6px' }} />
                  <Bar
                    dataKey="WP"
                    name="WP (Wood)"
                    fill={FUEL_CONFIG['WOOD PELLET'].color}
                    stackId={monthlyBarStyle === 'stacked' ? 'cons' : undefined}
                    radius={monthlyBarStyle === 'stacked' ? [0, 0, 0, 0] : [3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="CK"
                    name="CK (Cangkang)"
                    fill={FUEL_CONFIG['CANGKANG'].color}
                    stackId={monthlyBarStyle === 'stacked' ? 'cons' : undefined}
                    radius={monthlyBarStyle === 'stacked' ? [0, 0, 0, 0] : [3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="DP"
                    name="DP (Dust)"
                    fill={FUEL_CONFIG['DUST PELLET'].color}
                    stackId={monthlyBarStyle === 'stacked' ? 'cons' : undefined}
                    radius={monthlyBarStyle === 'stacked' ? [0, 0, 0, 0] : [3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="KP"
                    name="KP (Kopi)"
                    fill={FUEL_CONFIG['KOPI PELLET'].color}
                    stackId={monthlyBarStyle === 'stacked' ? 'cons' : undefined}
                    radius={monthlyBarStyle === 'stacked' ? [3, 3, 0, 0] : [3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Rekap Tekstual JAN, FEB, MARET, APRIL, DST: WP = CK = DP = KP = */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Rincian Konsumsi Bulanan:</span>
                <span className="font-mono text-slate-400">WP | CK | DP | KP</span>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {monthlyConsumptionBarData.map((item) => (
                  <div
                    key={`cons-row-${item.monthKey}`}
                    className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-mono"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 bg-slate-200/80 px-1.5 py-0.2 rounded text-[10px]">
                        {item.shortMonth.toUpperCase()}:
                      </span>
                      <span className="text-[10px] text-slate-600 font-semibold">
                        Total = {formatNumber(item.Total)} kg
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <span className="text-amber-800 bg-amber-50/80 px-1.5 py-0.5 rounded border border-amber-200/60 truncate">
                        WP = {formatNumber(item.WP)} kg
                      </span>
                      <span className="text-emerald-800 bg-emerald-50/80 px-1.5 py-0.5 rounded border border-emerald-200/60 truncate">
                        CK = {formatNumber(item.CK)} kg
                      </span>
                      <span className="text-sky-800 bg-sky-50/80 px-1.5 py-0.5 rounded border border-sky-200/60 truncate">
                        DP = {formatNumber(item.DP)} kg
                      </span>
                      <span className="text-purple-800 bg-purple-50/80 px-1.5 py-0.5 rounded border border-purple-200/60 truncate">
                        KP = {formatNumber(item.KP)} kg
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2. DIAGRAM BATANG AVG KG/TON STEAM (MONTHLY) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    2. AVG KG/TON STEAM (MONTHLY)
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  Kg/Ton Steam
                </span>
              </div>
            </div>

            {/* Diagram Batang Avg Kg/Ton Steam Bulanan */}
            <div className="h-60 min-h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyEfficiencyBarStats.kg.list} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="shortMonth" tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `${val}`} domain={[0, 'auto']} />
                  <Tooltip
                    formatter={(val: any) => [`${formatNumber(Number(val) || 0)} kg/Ton`, 'Avg Kg/Ton Steam']}
                    labelFormatter={(label: any) => `Bulan ${label}`}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar
                    dataKey="value"
                    name="Avg Kg/Ton Steam"
                    fill="#059669"
                    radius={[4, 4, 0, 0]}
                  >
                    {monthlyEfficiencyBarStats.kg.list.map((entry, index) => (
                      <Cell
                        key={`kg-cell-${index}`}
                        fill={
                          entry.value === monthlyEfficiencyBarStats.kg.highest?.value && entry.value > 0
                            ? '#047857'
                            : entry.value === monthlyEfficiencyBarStats.kg.lowest?.value && entry.value > 0
                            ? '#10b981'
                            : '#059669'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Status Box Tertinggi & Terendah Bulan (Dibawah Diagram Batang) */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1.5 font-mono">
              <div className="flex items-center justify-between px-2.5 py-1 rounded bg-rose-50 border border-rose-200 text-rose-950">
                <span className="font-bold flex items-center gap-1.5">
                  <span>🔺 TERTINGGI BULAN:</span>
                  <strong className="text-rose-900">{monthlyEfficiencyBarStats.kg.highest?.monthName || '-'}</strong>
                </span>
                <span className="font-extrabold text-rose-700 font-mono">
                  {monthlyEfficiencyBarStats.kg.highest ? `${formatNumber(monthlyEfficiencyBarStats.kg.highest.value)} kg/Ton` : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-950">
                <span className="font-bold flex items-center gap-1.5">
                  <span>🔻 TERENDAH BULAN:</span>
                  <strong className="text-emerald-900">{monthlyEfficiencyBarStats.kg.lowest?.monthName || '-'}</strong>
                </span>
                <span className="font-extrabold text-emerald-700 font-mono">
                  {monthlyEfficiencyBarStats.kg.lowest ? `${formatNumber(monthlyEfficiencyBarStats.kg.lowest.value)} kg/Ton` : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. DIAGRAM BATANG AVG RP/TON STEAM (MONTHLY) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <CircleDollarSign className="w-4 h-4 text-teal-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    3. AVG RP/ TON STEAM (MONTHLY)
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                  Rp/Ton Steam
                </span>
              </div>
            </div>

            {/* Diagram Batang Avg Rp/Ton Steam Bulanan */}
            <div className="h-60 min-h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyEfficiencyBarStats.rp.list} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="shortMonth" tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} domain={[0, 'auto']} />
                  <Tooltip
                    formatter={(val: any) => [`${formatRupiah(Number(val) || 0)}/Ton`, 'Avg Rp/Ton Steam']}
                    labelFormatter={(label: any) => `Bulan ${label}`}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar
                    dataKey="value"
                    name="Avg Rp/Ton Steam"
                    fill="#0d9488"
                    radius={[4, 4, 0, 0]}
                  >
                    {monthlyEfficiencyBarStats.rp.list.map((entry, index) => (
                      <Cell
                        key={`rp-cell-${index}`}
                        fill={
                          entry.value === monthlyEfficiencyBarStats.rp.highest?.value && entry.value > 0
                            ? '#0f766e'
                            : entry.value === monthlyEfficiencyBarStats.rp.lowest?.value && entry.value > 0
                            ? '#14b8a6'
                            : '#0d9488'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Status Box Tertinggi & Terendah Bulan (Dibawah Diagram Batang) */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1.5 font-mono">
              <div className="flex items-center justify-between px-2.5 py-1 rounded bg-rose-50 border border-rose-200 text-rose-950">
                <span className="font-bold flex items-center gap-1.5">
                  <span>🔺 TERTINGGI BULAN:</span>
                  <strong className="text-rose-900">{monthlyEfficiencyBarStats.rp.highest?.monthName || '-'}</strong>
                </span>
                <span className="font-extrabold text-rose-700 font-mono">
                  {monthlyEfficiencyBarStats.rp.highest ? `${formatRupiah(monthlyEfficiencyBarStats.rp.highest.value)}/Ton` : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between px-2.5 py-1 rounded bg-teal-50 border border-teal-200 text-teal-950">
                <span className="font-bold flex items-center gap-1.5">
                  <span>🔻 TERENDAH BULAN:</span>
                  <strong className="text-teal-900">{monthlyEfficiencyBarStats.rp.lowest?.monthName || '-'}</strong>
                </span>
                <span className="font-extrabold text-teal-700 font-mono">
                  {monthlyEfficiencyBarStats.rp.lowest ? `${formatRupiah(monthlyEfficiencyBarStats.rp.lowest.value)}/Ton` : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 DIAGRAM BATANG RATA-RATA HARGA BAHAN BAKAR: WP, CK, DP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: 1. RATA-RATA HARGA WOOD PELLET */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  1. Rata-Rata Harga Wood Pellet
                </h4>
              </div>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                Rp / kg
              </span>
            </div>
          </div>

          {/* Diagram Batang Wood Pellet */}
          <div className="h-60 min-h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyFuelPriceBarStats.wp.list} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="shortMonth" tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `Rp${val}`} domain={[0, 'auto']} />
                <Tooltip
                  formatter={(val: any) => [`${formatRupiah(Number(val) || 0)} / kg`, 'Harga WP']}
                  labelFormatter={(label: any) => `Bulan ${label}`}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Bar
                  dataKey="price"
                  name="Wood Pellet (WP)"
                  fill={FUEL_CONFIG['WOOD PELLET'].color}
                  radius={[4, 4, 0, 0]}
                >
                  {monthlyFuelPriceBarStats.wp.list.map((entry, index) => (
                    <Cell
                      key={`wp-cell-${index}`}
                      fill={
                        entry.price === monthlyFuelPriceBarStats.wp.highest?.price && entry.price > 0
                          ? '#b45309'
                          : entry.price === monthlyFuelPriceBarStats.wp.lowest?.price && entry.price > 0
                          ? '#f59e0b'
                          : '#d97706'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status Box Tertinggi & Terendah Bulan (Dibawah Diagram Batang) */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1.5 font-mono">
            <div className="flex items-center justify-between px-2.5 py-1 rounded bg-rose-50 border border-rose-200 text-rose-950">
              <span className="font-bold flex items-center gap-1.5">
                <span>🔺 TERTINGGI BULAN:</span>
                <strong className="text-rose-900">{monthlyFuelPriceBarStats.wp.highest?.monthName || '-'}</strong>
              </span>
              <span className="font-extrabold text-rose-700 font-mono">
                {monthlyFuelPriceBarStats.wp.highest ? `${formatRupiah(monthlyFuelPriceBarStats.wp.highest.price)}/kg` : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-950">
              <span className="font-bold flex items-center gap-1.5">
                <span>🔻 TERENDAH BULAN:</span>
                <strong className="text-amber-900">{monthlyFuelPriceBarStats.wp.lowest?.monthName || '-'}</strong>
              </span>
              <span className="font-extrabold text-amber-700 font-mono">
                {monthlyFuelPriceBarStats.wp.lowest ? `${formatRupiah(monthlyFuelPriceBarStats.wp.lowest.price)}/kg` : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: 2. RATA-RATA HARGA CANGKANG */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  2. Rata-Rata Harga Cangkang
                </h4>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                Rp / kg
              </span>
            </div>
          </div>

          {/* Diagram Batang Cangkang */}
          <div className="h-60 min-h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyFuelPriceBarStats.ck.list} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="shortMonth" tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `Rp${val}`} domain={[0, 'auto']} />
                <Tooltip
                  formatter={(val: any) => [`${formatRupiah(Number(val) || 0)} / kg`, 'Harga CK']}
                  labelFormatter={(label: any) => `Bulan ${label}`}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Bar
                  dataKey="price"
                  name="Cangkang Sawit (CK)"
                  fill={FUEL_CONFIG['CANGKANG'].color}
                  radius={[4, 4, 0, 0]}
                >
                  {monthlyFuelPriceBarStats.ck.list.map((entry, index) => (
                    <Cell
                      key={`ck-cell-${index}`}
                      fill={
                        entry.price === monthlyFuelPriceBarStats.ck.highest?.price && entry.price > 0
                          ? '#15803d'
                          : entry.price === monthlyFuelPriceBarStats.ck.lowest?.price && entry.price > 0
                          ? '#4ade80'
                          : '#16a34a'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status Box Tertinggi & Terendah Bulan (Dibawah Diagram Batang) */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1.5 font-mono">
            <div className="flex items-center justify-between px-2.5 py-1 rounded bg-rose-50 border border-rose-200 text-rose-950">
              <span className="font-bold flex items-center gap-1.5">
                <span>🔺 TERTINGGI BULAN:</span>
                <strong className="text-rose-900">{monthlyFuelPriceBarStats.ck.highest?.monthName || '-'}</strong>
              </span>
              <span className="font-extrabold text-rose-700 font-mono">
                {monthlyFuelPriceBarStats.ck.highest ? `${formatRupiah(monthlyFuelPriceBarStats.ck.highest.price)}/kg` : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-950">
              <span className="font-bold flex items-center gap-1.5">
                <span>🔻 TERENDAH BULAN:</span>
                <strong className="text-emerald-900">{monthlyFuelPriceBarStats.ck.lowest?.monthName || '-'}</strong>
              </span>
              <span className="font-extrabold text-emerald-700 font-mono">
                {monthlyFuelPriceBarStats.ck.lowest ? `${formatRupiah(monthlyFuelPriceBarStats.ck.lowest.price)}/kg` : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: 3. RATA-RATA HARGA DUST PELLET */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-sky-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  3. Rata-Rata Harga Dust Pellet
                </h4>
              </div>
              <span className="text-[10px] font-bold text-sky-800 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
                Rp / kg
              </span>
            </div>
          </div>

          {/* Diagram Batang Dust Pellet */}
          <div className="h-60 min-h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyFuelPriceBarStats.dp.list} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="shortMonth" tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `Rp${val}`} domain={[0, 'auto']} />
                <Tooltip
                  formatter={(val: any) => [`${formatRupiah(Number(val) || 0)} / kg`, 'Harga DP']}
                  labelFormatter={(label: any) => `Bulan ${label}`}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Bar
                  dataKey="price"
                  name="Dust Pellet (DP)"
                  fill={FUEL_CONFIG['DUST PELLET'].color}
                  radius={[4, 4, 0, 0]}
                >
                  {monthlyFuelPriceBarStats.dp.list.map((entry, index) => (
                    <Cell
                      key={`dp-cell-${index}`}
                      fill={
                        entry.price === monthlyFuelPriceBarStats.dp.highest?.price && entry.price > 0
                          ? '#0369a1'
                          : entry.price === monthlyFuelPriceBarStats.dp.lowest?.price && entry.price > 0
                          ? '#7dd3fc'
                          : '#0284c7'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status Box Tertinggi & Terendah Bulan (Dibawah Diagram Batang) */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1.5 font-mono">
            <div className="flex items-center justify-between px-2.5 py-1 rounded bg-rose-50 border border-rose-200 text-rose-950">
              <span className="font-bold flex items-center gap-1.5">
                <span>🔺 TERTINGGI BULAN:</span>
                <strong className="text-rose-900">{monthlyFuelPriceBarStats.dp.highest?.monthName || '-'}</strong>
              </span>
              <span className="font-extrabold text-rose-700 font-mono">
                {monthlyFuelPriceBarStats.dp.highest ? `${formatRupiah(monthlyFuelPriceBarStats.dp.highest.price)}/kg` : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1 rounded bg-sky-50 border border-sky-200 text-sky-950">
              <span className="font-bold flex items-center gap-1.5">
                <span>🔻 TERENDAH BULAN:</span>
                <strong className="text-sky-900">{monthlyFuelPriceBarStats.dp.lowest?.monthName || '-'}</strong>
              </span>
              <span className="font-extrabold text-sky-700 font-mono">
                {monthlyFuelPriceBarStats.dp.lowest ? `${formatRupiah(monthlyFuelPriceBarStats.dp.lowest.price)}/kg` : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 DIAGRAM BATANG HARGA AVG PO: WP, CK, DP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: 1. HARGA AVG PO WOOD PELLET */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  1. HARGA AVG PO WOOD PELLET
                </h4>
              </div>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                Rp / kg
              </span>
            </div>
          </div>

          <div className="h-60 min-h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyPoPriceBarStats.wp.list} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="shortMonth" tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `Rp${val}`} domain={[0, 'auto']} />
                <Tooltip
                  formatter={(val: any) => [`${formatRupiah(Number(val) || 0)} / kg`, 'Harga PO WP']}
                  labelFormatter={(label: any) => `Bulan ${label}`}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="price" name="Harga PO Wood Pellet" fill="#d97706" radius={[4, 4, 0, 0]}>
                  {monthlyPoPriceBarStats.wp.list.map((entry, index) => (
                    <Cell
                      key={`po-wp-cell-${index}`}
                      fill={
                        entry.price === monthlyPoPriceBarStats.wp.highest?.price && entry.price > 0
                          ? '#b45309'
                          : entry.price === monthlyPoPriceBarStats.wp.lowest?.price && entry.price > 0
                          ? '#f59e0b'
                          : '#d97706'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1.5 font-mono">
            <div className="flex items-center justify-between px-2.5 py-1 rounded bg-rose-50 border border-rose-200 text-rose-950">
              <span className="font-bold flex items-center gap-1.5">
                <span>🔺 TERTINGGI BULAN:</span>
                <strong className="text-rose-900">{monthlyPoPriceBarStats.wp.highest?.monthName || '-'}</strong>
              </span>
              <span className="font-extrabold text-rose-700 font-mono">
                {monthlyPoPriceBarStats.wp.highest ? `${formatRupiah(monthlyPoPriceBarStats.wp.highest.price)}/kg` : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-950">
              <span className="font-bold flex items-center gap-1.5">
                <span>🔻 TERENDAH BULAN:</span>
                <strong className="text-amber-900">{monthlyPoPriceBarStats.wp.lowest?.monthName || '-'}</strong>
              </span>
              <span className="font-extrabold text-amber-700 font-mono">
                {monthlyPoPriceBarStats.wp.lowest ? `${formatRupiah(monthlyPoPriceBarStats.wp.lowest.price)}/kg` : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: 2. HARGA AVG PO CANGKANG */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  2. HARGA AVG PO CANGKANG
                </h4>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                Rp / kg
              </span>
            </div>
          </div>

          <div className="h-60 min-h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyPoPriceBarStats.ck.list} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="shortMonth" tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `Rp${val}`} domain={[0, 'auto']} />
                <Tooltip
                  formatter={(val: any) => [`${formatRupiah(Number(val) || 0)} / kg`, 'Harga PO CK']}
                  labelFormatter={(label: any) => `Bulan ${label}`}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="price" name="Harga PO Cangkang" fill="#16a34a" radius={[4, 4, 0, 0]}>
                  {monthlyPoPriceBarStats.ck.list.map((entry, index) => (
                    <Cell
                      key={`po-ck-cell-${index}`}
                      fill={
                        entry.price === monthlyPoPriceBarStats.ck.highest?.price && entry.price > 0
                          ? '#15803d'
                          : entry.price === monthlyPoPriceBarStats.ck.lowest?.price && entry.price > 0
                          ? '#4ade80'
                          : '#16a34a'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1.5 font-mono">
            <div className="flex items-center justify-between px-2.5 py-1 rounded bg-rose-50 border border-rose-200 text-rose-950">
              <span className="font-bold flex items-center gap-1.5">
                <span>🔺 TERTINGGI BULAN:</span>
                <strong className="text-rose-900">{monthlyPoPriceBarStats.ck.highest?.monthName || '-'}</strong>
              </span>
              <span className="font-extrabold text-rose-700 font-mono">
                {monthlyPoPriceBarStats.ck.highest ? `${formatRupiah(monthlyPoPriceBarStats.ck.highest.price)}/kg` : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-950">
              <span className="font-bold flex items-center gap-1.5">
                <span>🔻 TERENDAH BULAN:</span>
                <strong className="text-emerald-900">{monthlyPoPriceBarStats.ck.lowest?.monthName || '-'}</strong>
              </span>
              <span className="font-extrabold text-emerald-700 font-mono">
                {monthlyPoPriceBarStats.ck.lowest ? `${formatRupiah(monthlyPoPriceBarStats.ck.lowest.price)}/kg` : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: 3. HARGA AVG PO DUST PELLET */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-sky-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  3. HARGA AVG PO DUST PELLET
                </h4>
              </div>
              <span className="text-[10px] font-bold text-sky-800 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
                Rp / kg
              </span>
            </div>
          </div>

          <div className="h-60 min-h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyPoPriceBarStats.dp.list} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="shortMonth" tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `Rp${val}`} domain={[0, 'auto']} />
                <Tooltip
                  formatter={(val: any) => [`${formatRupiah(Number(val) || 0)} / kg`, 'Harga PO DP']}
                  labelFormatter={(label: any) => `Bulan ${label}`}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="price" name="Harga PO Dust Pellet" fill="#0284c7" radius={[4, 4, 0, 0]}>
                  {monthlyPoPriceBarStats.dp.list.map((entry, index) => (
                    <Cell
                      key={`po-dp-cell-${index}`}
                      fill={
                        entry.price === monthlyPoPriceBarStats.dp.highest?.price && entry.price > 0
                          ? '#0369a1'
                          : entry.price === monthlyPoPriceBarStats.dp.lowest?.price && entry.price > 0
                          ? '#7dd3fc'
                          : '#0284c7'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1.5 font-mono">
            <div className="flex items-center justify-between px-2.5 py-1 rounded bg-rose-50 border border-rose-200 text-rose-950">
              <span className="font-bold flex items-center gap-1.5">
                <span>🔺 TERTINGGI BULAN:</span>
                <strong className="text-rose-900">{monthlyPoPriceBarStats.dp.highest?.monthName || '-'}</strong>
              </span>
              <span className="font-extrabold text-rose-700 font-mono">
                {monthlyPoPriceBarStats.dp.highest ? `${formatRupiah(monthlyPoPriceBarStats.dp.highest.price)}/kg` : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1 rounded bg-sky-50 border border-sky-200 text-sky-950">
              <span className="font-bold flex items-center gap-1.5">
                <span>🔻 TERENDAH BULAN:</span>
                <strong className="text-sky-900">{monthlyPoPriceBarStats.dp.lowest?.monthName || '-'}</strong>
              </span>
              <span className="font-extrabold text-sky-700 font-mono">
                {monthlyPoPriceBarStats.dp.lowest ? `${formatRupiah(monthlyPoPriceBarStats.dp.lowest.price)}/kg` : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. DIAGRAM LINGKARAN REKAPITULASI TERTINGGI & TERENDAH HARIAN */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-600" />
              <span>2. Diagram Lingkaran Rekapitulasi Tertinggi &amp; Terendah Harian</span>
            </h3>
            <p className="text-xs text-slate-500">
              Perbandingan performa per tanggal/hari dari data spreadsheet: Konsumsi Bahan Bakar (kg), Nilai Rata-rata Steam Out &amp; Kg/Ton Steam, dan Nilai Rata-rata Rp/Ton Steam.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. DIAGRAM LINGKARAN KONSUMSI TERTINGGI & TERENDAH (HARI) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    1. KONSUMSI TERTINGGI TERENDAH &amp; STEAM OUT (DAILY)
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  Kg Bahan Bakar
                </span>
              </div>

              {/* Status Box Tertinggi & Terendah */}
              <div className="mb-2 p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] space-y-1 font-mono">
                <div className="flex items-center justify-between px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-950">
                  <span className="font-bold flex items-center gap-1">
                    <span>🔺 Tertinggi:</span>
                    <strong className="text-amber-900">{dailyStats.highestConsumption?.tanggal}</strong>
                  </span>
                  <span className="font-extrabold text-amber-700 font-mono">
                    {formatNumber(dailyStats.highestConsumption?.totalKonsumsi || 0)} kg{' '}
                    <span className="text-[9px] font-semibold text-amber-800">
                      ({formatNumber(dailyStats.highestConsumption?.['Steam Out'] || 0)} T)
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between px-2 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-950">
                  <span className="font-bold flex items-center gap-1">
                    <span>🔻 Terendah:</span>
                    <strong className="text-sky-900">{dailyStats.lowestConsumption?.tanggal}</strong>
                  </span>
                  <span className="font-extrabold text-sky-700 font-mono">
                    {formatNumber(dailyStats.lowestConsumption?.totalKonsumsi || 0)} kg{' '}
                    <span className="text-[9px] font-semibold text-sky-800">
                      ({formatNumber(dailyStats.lowestConsumption?.['Steam Out'] || 0)} T)
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="h-60 min-h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieDailyConsumptionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="32%"
                    innerRadius={0}
                    outerRadius={56}
                    paddingAngle={1}
                  >
                    {pieDailyConsumptionData.map((entry, index) => (
                      <Cell key={`cell-daily-cons-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, _name: any, item: any) => [
                      `${item.payload.display} (Steam Out: ${item.payload.steamOut})`,
                      `${item.payload.date} (${item.payload.status})`
                    ]}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{ paddingTop: '12px', fontSize: '10px' }}
                    formatter={(value: any) => {
                      const item = pieDailyConsumptionData.find((p) => p.name === value);
                      return (
                        <span className="text-[10px] font-medium text-slate-700 inline-flex items-center gap-1">
                          <span>{value}:</span>
                          <strong className="font-mono text-slate-900">{item?.display}</strong>
                          <span className="text-[9px] text-slate-500 font-normal">({item?.steamOut})</span>
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. DIAGRAM LINGKARAN NILAI RATA-RATA STEAM OUT & KG/TON STEAM TERTINGGI & TERENDAH (HARI) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    2. AVG KG/TON &amp; STEAM OUT (DAILY)
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  Kg/Ton Steam
                </span>
              </div>

              {/* Status Box Tertinggi & Terendah */}
              <div className="mb-2 p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] space-y-1 font-mono">
                <div className="flex items-center justify-between px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-950">
                  <span className="font-bold flex items-center gap-1">
                    <span>🔺 Tertinggi:</span>
                    <strong className="text-rose-900">{dailyStats.highestSteamKg?.tanggal}</strong>
                  </span>
                  <span className="font-extrabold text-rose-700 font-mono">
                    {formatNumber(dailyStats.highestSteamKg?.['Kg per Ton Steam'] || 0)} kg/Ton{' '}
                    <span className="text-[9px] font-semibold text-rose-800">
                      ({formatNumber(dailyStats.highestSteamKg?.['Steam Out'] || 0)} T)
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-950">
                  <span className="font-bold flex items-center gap-1">
                    <span>🔻 Terendah:</span>
                    <strong className="text-emerald-900">{dailyStats.lowestSteamKg?.tanggal}</strong>
                  </span>
                  <span className="font-extrabold text-emerald-700 font-mono">
                    {formatNumber(dailyStats.lowestSteamKg?.['Kg per Ton Steam'] || 0)} kg/Ton{' '}
                    <span className="text-[9px] font-semibold text-emerald-800">
                      ({formatNumber(dailyStats.lowestSteamKg?.['Steam Out'] || 0)} T)
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="h-60 min-h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieDailySteamKgData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="32%"
                    innerRadius={0}
                    outerRadius={56}
                    paddingAngle={1}
                  >
                    {pieDailySteamKgData.map((entry, index) => (
                      <Cell key={`cell-daily-kg-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, _name: any, item: any) => [
                      `${item.payload.display} (Steam Out: ${item.payload.steamOut})`,
                      `${item.payload.date} (${item.payload.status})`
                    ]}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{ paddingTop: '12px', fontSize: '10px' }}
                    formatter={(value: any) => {
                      const item = pieDailySteamKgData.find((p) => p.name === value);
                      return (
                        <span className="text-[10px] font-medium text-slate-700 inline-flex items-center gap-1">
                          <span>{value}:</span>
                          <strong className="font-mono text-slate-900">{item?.display}</strong>
                          <span className="text-[9px] text-slate-500 font-normal">({item?.steamOut})</span>
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. DIAGRAM LINGKARAN NILAI RATA-RATA RP/TON STEAM TERTINGGI & TERENDAH (HARI) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <CircleDollarSign className="w-4 h-4 text-teal-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    3. AVG RP/TON STEAM (DAILY)
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                  Rp/Ton Steam
                </span>
              </div>

              {/* Status Box Tertinggi & Terendah */}
              <div className="mb-2 p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] space-y-1 font-mono">
                <div className="flex items-center justify-between px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-950">
                  <span className="font-bold flex items-center gap-1">
                    <span>🔺 Tertinggi:</span>
                    <strong className="text-rose-900">{dailyStats.highestRpSteam?.tanggal}</strong>
                  </span>
                  <span className="font-extrabold text-rose-700 font-mono">
                    {formatRupiah(dailyStats.highestRpSteam?.['Rp per Ton Steam'] || 0)}/Ton{' '}
                    <span className="text-[9px] font-semibold text-rose-800">
                      ({formatNumber(dailyStats.highestRpSteam?.['Steam Out'] || 0)} T)
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between px-2 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-950">
                  <span className="font-bold flex items-center gap-1">
                    <span>🔻 Terendah:</span>
                    <strong className="text-teal-900">{dailyStats.lowestRpSteam?.tanggal}</strong>
                  </span>
                  <span className="font-extrabold text-teal-700 font-mono">
                    {formatRupiah(dailyStats.lowestRpSteam?.['Rp per Ton Steam'] || 0)}/Ton{' '}
                    <span className="text-[9px] font-semibold text-teal-800">
                      ({formatNumber(dailyStats.lowestRpSteam?.['Steam Out'] || 0)} T)
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="h-60 min-h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieDailyRpSteamData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="32%"
                    innerRadius={0}
                    outerRadius={56}
                    paddingAngle={1}
                  >
                    {pieDailyRpSteamData.map((entry, index) => (
                      <Cell key={`cell-daily-rp-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, _name: any, item: any) => [
                      `${item.payload.display} (Steam Out: ${item.payload.steamOut})`,
                      `${item.payload.date} (${item.payload.status})`
                    ]}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{ paddingTop: '12px', fontSize: '10px' }}
                    formatter={(value: any) => {
                      const item = pieDailyRpSteamData.find((p) => p.name === value);
                      return (
                        <span className="text-[10px] font-medium text-slate-700 inline-flex items-center gap-1">
                          <span>{value}:</span>
                          <strong className="font-mono text-slate-900">{item?.display}</strong>
                          <span className="text-[9px] text-slate-500 font-normal">({item?.steamOut})</span>
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {dateFilterBar}

      {/* 3. GRAFIK PEMAKAIAN KONSUMSI HARIAN & KG/TON STEAM */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-600" />
              <span>3. Grafik Pemakaian Konsumsi Harian &amp; Kg/Ton Steam</span>
            </h3>
            <p className="text-xs text-slate-500">
              Grafik interaktif harian dengan sinkronisasi otomatis spreadsheet dan kalkulasi rasio efisiensi real-time.
            </p>
          </div>
        </div>
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

        {/* GRAFIK PEMAKAIAN KONSUMSI HARIAN DIGABUNG DENGAN GRAFIK KG/TON STEAM (SINKRON SPREADSHEET OTOMATIS) */}
        {chartMode === 'kg_steam' && (
          <div className="space-y-4">
            {/* Realtime Synchronization & Action Toolbar */}
            <div className="hidden flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-gradient-to-r from-emerald-50/90 via-slate-50 to-amber-50/50 border border-emerald-200/80 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                </span>
                <span className="text-xs font-bold text-slate-800">
                  Sinkronisasi Otomatis Spreadsheet Aktif
                </span>
                <span className="hidden sm:inline-block text-[11px] text-slate-500 font-medium">
                  · Saat data konsumsi atau steam diubah, kurva Kg/Ton Steam otomatis terkalkulasi
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Toggle Urutan Tanggal: Sesuai Urutan Spreadsheet (01 -> 31) vs Terbaru (31 -> 01) */}
                <button
                  type="button"
                  onClick={() => setChartDateSort((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white text-slate-700 hover:text-slate-900 border border-slate-300 shadow-2xs hover:bg-slate-50 transition-colors"
                  title="Ubah urutan tanggal pada sumbu X grafik"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    Urutan: {chartDateSort === 'asc' ? '01 → 31 (Spreadsheet)' : '31 → 01 (Terbaru)'}
                  </span>
                </button>

                {/* Tombol Ubah / Edit Cepat Data Steam Out atau Konsumsi */}
                <button
                  type="button"
                  onClick={() => {
                    const first = chartData[0];
                    if (first) {
                      setEditingDay({
                        date: first.rawTanggal || first.tanggal,
                        displayTanggal: first.tanggal,
                        steamOut: first['Steam Out'] || 320,
                        totalKonsumsi: first.totalKonsumsi || 0,
                        cangkang: first.CANGKANG || 0,
                        wood: first['WOOD PELLET'] || 0,
                        dust: first['DUST PELLET'] || 0,
                        kopi: first['KOPI PELLET'] || 0,
                      });
                      setEditSteamInput(String(first['Steam Out'] || 320));
                      setEditCangkangInput(String(first.CANGKANG || 0));
                      setEditWoodInput(String(first['WOOD PELLET'] || 0));
                      setEditDustInput(String(first['DUST PELLET'] || 0));
                      setEditKopiInput(String(first['KOPI PELLET'] || 0));
                    }
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 shadow-2xs transition-colors"
                  title="Ubah nilai Steam Out atau Konsumsi harian untuk menguji otomatisasi grafik secara langsung"
                >
                  <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ubah Data Steam / Konsumsi</span>
                </button>

                {/* Tombol Sinkronkan Sekarang dari Spreadsheet */}
                {onPerformSync && (
                  <button
                    type="button"
                    onClick={onPerformSync}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs transition-colors disabled:opacity-50"
                    title="Perbarui data langsung dari Google Sheets"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                  </button>
                )}
              </div>
            </div>

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
                <ComposedChart
                  data={chartData}
                  margin={{ top: 20, right: 35, left: 30, bottom: 20 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length > 0) {
                      const item = e.activePayload[0].payload;
                      if (item) {
                        setEditingDay({
                          date: item.rawTanggal || item.tanggal,
                          displayTanggal: item.tanggal,
                          steamOut: item['Steam Out'] || 0,
                          totalKonsumsi: item.totalKonsumsi || 0,
                          cangkang: item.CANGKANG || 0,
                          wood: item['WOOD PELLET'] || 0,
                          dust: item['DUST PELLET'] || 0,
                          kopi: item['KOPI PELLET'] || 0,
                        });
                        setEditSteamInput(String(item['Steam Out'] || 0));
                        setEditCangkangInput(String(item.CANGKANG || 0));
                        setEditWoodInput(String(item['WOOD PELLET'] || 0));
                        setEditDustInput(String(item['DUST PELLET'] || 0));
                        setEditKopiInput(String(item['KOPI PELLET'] || 0));
                      }
                    }
                  }}
                >
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
                  {/* Batang Konsumsi Bahan Bakar Harian per jenis - isAnimationActive={false} untuk respon seketika */}
                  <Bar
                    yAxisId="left"
                    dataKey="CANGKANG"
                    name="Cangkang Sawit"
                    stackId={barStyle === 'stacked' ? 'fuel' : undefined}
                    fill={FUEL_CONFIG['CANGKANG'].color}
                    radius={barStyle === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="WOOD PELLET"
                    name="Wood Pellet"
                    stackId={barStyle === 'stacked' ? 'fuel' : undefined}
                    fill={FUEL_CONFIG['WOOD PELLET'].color}
                    radius={barStyle === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="DUST PELLET"
                    name="Dust Pellet"
                    stackId={barStyle === 'stacked' ? 'fuel' : undefined}
                    fill={FUEL_CONFIG['DUST PELLET'].color}
                    radius={barStyle === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="KOPI PELLET"
                    name="Kopi Pellet"
                    stackId={barStyle === 'stacked' ? 'fuel' : undefined}
                    fill={FUEL_CONFIG['KOPI PELLET'].color}
                    radius={barStyle === 'stacked' ? [4, 4, 0, 0] : [4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                  {/* Garis Kg/Ton Steam Warna Hitam (#000000) - Terhubung Langsung & Real-Time */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="Kg per Ton Steam"
                    name="Kg/Ton steam"
                    stroke="#000000"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#000000', stroke: '#ffffff', strokeWidth: 1.5 }}
                    activeDot={{ r: 6, fill: '#000000' }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-slate-500 italic text-center">
              💡 Tips: Klik pada salah satu titik grafik atau batang untuk mengedit Steam Out dan melihat kurva Kg/Ton Steam langsung berubah secara instan.
            </p>
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

      </div>
      {/* Quick Edit Modal: Ubah Steam Out / Konsumsi Harian & Langsung Berubah Otomatis */}
      {editingDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-emerald-400" />
                  <span>Ubah Data Steam Out &amp; Konsumsi</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tanggal: <strong className="text-white font-mono">{editingDay.displayTanggal}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingDay(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900">
                <p className="font-semibold flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Otomatisasi Real-Time 1:1</span>
                </p>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Begitu nilai Steam Out atau Konsumsi disimpan, rasio <strong>Kg/Ton Steam</strong> langsung dikalkulasi ulang dan kurva garis pada grafik berubah seketika.
                </p>
              </div>

              {/* Steam Out Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Steam Out (Ton):</span>
                  <span className="text-[10px] text-slate-500 font-mono">Nilai Produksi Uap</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={editSteamInput}
                  onChange={(e) => setEditSteamInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  placeholder="Contoh: 340"
                />
              </div>

              {/* Simulasi Perhitungan Langsung */}
              {(() => {
                const sVal = parseFloat(editSteamInput) || 0;
                const totalKg = editingDay.totalKonsumsi;
                const newRatio = sVal > 0 ? Math.round(totalKg / sVal) : 0;
                return (
                  <div className="p-3 bg-slate-900 text-white rounded-lg font-mono text-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Kalkulasi Kg/Ton Steam Baru:</span>
                      <span className="text-lg font-black text-emerald-400">
                        {newRatio > 0 ? `${formatNumber(newRatio)} kg/Ton` : '0 kg/Ton'}
                      </span>
                    </div>
                    <div className="text-right text-[11px] text-slate-300">
                      <div>Konsumsi: {formatNumber(totalKg)} kg</div>
                      <div>Steam: {sVal} Ton</div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDay(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sVal = parseFloat(editSteamInput);
                    if (!isNaN(sVal) && onUpdateDailySteam) {
                      onUpdateDailySteam(editingDay.date, sVal);
                    }
                    setEditingDay(null);
                  }}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Terapkan ke Grafik</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
