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
  LineChart,
  Line,
  ComposedChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { DailyFuelSummary, FuelType } from '../types/boiler';
import { FUEL_CONFIG, FUEL_TYPES, DAILY_CONSUMPTION_RECORDS, DailyConsumptionRecord } from '../data/initialData';
import { formatNumber, formatRupiah } from '../utils/calculations';
import { BarChart3, TrendingUp, PieChart as PieIcon, Activity, Layers, Fuel, CircleDollarSign } from 'lucide-react';

interface ChartsSectionProps {
  summaries: DailyFuelSummary[];
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({ summaries }) => {
  const [chartMode, setChartMode] = useState<'consumption' | 'cost' | 'steam_efficiency'>('cost');
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
      const woodDustCost = match
        ? match.woodDustHarga
        : ((s.breakdown['WOOD PELLET']?.hargaTotal || 0) + (s.breakdown['DUST PELLET']?.hargaTotal || 0));
      const kopiCost = match ? match.kopiHarga : (s.breakdown['KOPI PELLET']?.hargaTotal || 0);
      const totalBiaya = match ? match.totalHarga : s.totalHarga;

      // Split wood and dust cost proportionally if both exist
      const woodCost = match
        ? (woodKg + dustKg > 0 ? Math.round(woodDustCost * (woodKg / (woodKg + dustKg))) : 0)
        : (s.breakdown['WOOD PELLET']?.hargaTotal || 0);
      const dustCost = match
        ? (woodDustCost - woodCost)
        : (s.breakdown['DUST PELLET']?.hargaTotal || 0);

      const steamOut = match ? match.steamOut : s.steamOut;
      const kgPerTonSteam = match ? match.kgPerTonSteam : s.kgPerTonSteam;
      const rpPerTonSteam = match ? match.rpPerTonSteam : s.rpPerTonSteam;

      return {
        tanggal: s.displayTanggal,
        rawTanggal: s.tanggal,
        'CANGKANG': cangkangKg,
        'WOOD PELLET': woodKg,
        'DUST PELLET': dustKg,
        'KOPI PELLET': kopiKg,
        'Total Konsumsi': totalKonsumsi,
        totalKonsumsi,

        // Cost data synchronized with spreadsheet
        'CANGKANG_COST': cangkangCost,
        'WOOD_PELLET_COST': woodCost,
        'DUST_PELLET_COST': dustCost,
        'KOPI_PELLET_COST': kopiCost,
        woodDustCost,
        'Total Biaya': totalBiaya,
        totalBiaya,

        // Steam efficiency synchronized with spreadsheet
        'Steam Out': steamOut,
        'Kg per Ton Steam': kgPerTonSteam,
        'Rp per Ton Steam': Math.round(rpPerTonSteam),
      };
    });
  }, [summaries, preloadedRecordsMap]);

  // Custom Tooltip (Dialog Batang) displaying Daily Total Prices & Breakdown
  const CustomConsumptionTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div className="bg-slate-900/95 text-white p-3.5 rounded-xl border border-slate-700 shadow-2xl text-xs min-w-[300px] max-w-sm backdrop-blur-md">
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

        {/* KETERANGAN TOTAL BIAYA & KONSUMSI HARIAN */}
        <div className="bg-slate-800/80 rounded-lg p-2.5 mb-2.5 border border-slate-700/60 space-y-1">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="font-bold text-[11px]">TOTAL HARGA / BIAYA:</span>
            <span className="font-mono font-extrabold text-sm text-emerald-300">
              {formatRupiah(data.totalBiaya)}
            </span>
          </div>
          <div className="flex items-center justify-between text-amber-300 text-[11px]">
            <span className="font-bold">TOTAL KONSUMSI:</span>
            <span className="font-mono font-bold text-amber-200">
              {formatNumber(data.totalKonsumsi)} kg
            </span>
          </div>
          <div className="flex items-center justify-between text-sky-300 text-[10px] pt-0.5 border-t border-slate-700/50">
            <span>STEAM OUT & EFISIENSI:</span>
            <span className="font-mono font-medium text-sky-200">
              {formatNumber(data['Steam Out'])} Ton · {data['Kg per Ton Steam']} kg/Ton ({formatRupiah(data['Rp per Ton Steam'])}/Ton)
            </span>
          </div>
        </div>

        {/* RINCIAN TOTAL HARGA PER BAHAN BAKAR */}
        <div className="bg-slate-800/60 rounded-lg p-2.5 mb-2 border border-slate-700/50">
          <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <CircleDollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>TOTAL HARGA PER BAHAN BAKAR:</span>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-emerald-300 font-semibold text-[10px]">TOTAL HARGA CANGKANG:</span>
              <span className="font-mono font-bold text-emerald-300">
                {formatRupiah(data.CANGKANG_COST || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-amber-300 font-semibold text-[10px]">TOTAL HARGA WOOD & DUST:</span>
              <span className="font-mono font-bold text-amber-300">
                {formatRupiah(data.woodDustCost || (data.WOOD_PELLET_COST + data.DUST_PELLET_COST) || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-purple-300 font-semibold text-[10px]">TOTAL HARGA KOPI PELLET:</span>
              <span className="font-mono font-bold text-purple-300">
                {formatRupiah(data.KOPI_PELLET_COST || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* RINCIAN TOTAL VOLUME KONSUMSI */}
        <div className="bg-slate-800/40 rounded-lg p-2 border border-slate-700/40">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Fuel className="w-3 h-3 text-slate-400" />
            <span>Volume Konsumsi Spreadsheet (kg):</span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300 font-mono">
            <div>Cangkang: {formatNumber(data.CANGKANG || 0)} kg</div>
            <div>Wood: {formatNumber(data['WOOD PELLET'] || 0)} kg</div>
            <div>Dust: {formatNumber(data['DUST PELLET'] || 0)} kg</div>
            <div>Kopi: {formatNumber(data['KOPI PELLET'] || 0)} kg</div>
          </div>
        </div>
      </div>
    );
  };

  // Donut data for aggregate fuel consumption and cost - 100% synchronized with spreadsheet table
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

    return [
      {
        name: 'Cangkang Sawit',
        valueKg: totalCangkangKg,
        valueCost: totalCangkangCost,
        color: FUEL_CONFIG['CANGKANG'].color,
      },
      {
        name: 'Wood Pellet',
        valueKg: totalWoodKg,
        valueCost: totalWoodCost,
        color: FUEL_CONFIG['WOOD PELLET'].color,
      },
      {
        name: 'Dust Pellet',
        valueKg: totalDustKg,
        valueCost: totalDustCost,
        color: FUEL_CONFIG['DUST PELLET'].color,
      },
      {
        name: 'Kopi Pellet',
        valueKg: totalKopiKg,
        valueCost: totalKopiCost,
        color: FUEL_CONFIG['KOPI PELLET'].color,
      },
    ];
  }, [chartData]);

  return (
    <div className="space-y-6">
      {/* Chart Navigation and Toggles */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setChartMode('consumption')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              chartMode === 'consumption'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-500" />
            <span>1. Konsumsi per Hari (kg)</span>
          </button>

          <button
            onClick={() => setChartMode('cost')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              chartMode === 'cost'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>2. Total Biaya per Hari (Rp)</span>
          </button>

          <button
            onClick={() => setChartMode('steam_efficiency')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              chartMode === 'steam_efficiency'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-indigo-500" />
            <span>3. Efisiensi Steam & Rasio</span>
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
                Stacked (Akumulasi)
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
              {chartMode === 'consumption' && 'Visualisasi Total Konsumsi Harian per Jenis Bahan Bakar (kg)'}
              {chartMode === 'cost' && 'Visualisasi Total Harga / Biaya Konsumsi Harian (Rp)'}
              {chartMode === 'steam_efficiency' && 'Tren Produksi Steam Out (Ton) vs Biaya per Ton Steam (Rp/Ton)'}
            </h3>
            <p className="text-xs text-slate-500">
              {chartMode === 'consumption' && 'Arahkan kursor atau sentuh batang grafik untuk menampilkan dialog rincian total harga per bahan bakar dan volume konsumsi.'}
              {chartMode === 'cost' && 'Arahkan kursor atau sentuh batang grafik untuk menampilkan dialog rincian total harga masing-masing bahan bakar serta perbandingan pengeluaran.'}
              {chartMode === 'steam_efficiency' && 'Evaluasi performa efisiensi boiler: specific fuel consumption dan steam unit cost.'}
            </p>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            {summaries.length} Hari Pengamatan
          </div>
        </div>

        {/* 1. CONSUMPTION CHART */}
        {chartMode === 'consumption' && (
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="tanggal" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  label={{ value: 'Konsumsi (kg)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 11 } }}
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
                  name="Cangkang"
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

        {/* 2. COST CHART */}
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
                  name="Cangkang"
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
                {/* Total Line */}
                <Line
                  type="monotone"
                  dataKey="Total Biaya"
                  name="Total Pengeluaran Harian"
                  stroke="#0f172a"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#0f172a' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 3. STEAM EFFICIENCY CHART */}
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
                  formatter={(value: any, name: any) => {
                    if (name === 'Rp per Ton Steam') return [formatRupiah(Number(value), true), name];
                    if (name === 'Steam Out') return [`${formatNumber(Number(value))} Ton`, name];
                    return [`${value} kg/Ton`, name];
                  }}
                  labelFormatter={(label) => `Tanggal: ${label}`}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    color: '#fff',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
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

      {/* Two Column Mix Breakdown (Volume Share vs Spend Share) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Donut 1: Volume Konsumsi */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Distribusi Konsumsi Bahan Bakar (KG)
              </h4>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Total {formatNumber(fuelAggregates.reduce((a, b) => a + b.valueKg, 0))} kg
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fuelAggregates}
                  dataKey="valueKg"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {fuelAggregates.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${formatNumber(Number(val))} kg`, 'Konsumsi']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut 2: Biaya Pengeluaran (Rp) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Distribusi Biaya Bahan Bakar (RP)
              </h4>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Total {formatRupiah(fuelAggregates.reduce((a, b) => a + b.valueCost, 0))}
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fuelAggregates}
                  dataKey="valueCost"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {fuelAggregates.map((entry, index) => (
                    <Cell key={`cell-cost-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [formatRupiah(Number(val)), 'Total Biaya']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
