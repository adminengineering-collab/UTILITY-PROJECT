import React, { useMemo } from 'react';
import { DailyFuelSummary, FuelType } from '../types/boiler';
import { FUEL_CONFIG, FUEL_TYPES, DAILY_CONSUMPTION_RECORDS, DailyConsumptionRecord } from '../data/initialData';
import { formatNumber, formatRupiah } from '../utils/calculations';
import { CircleDollarSign, Scale, Gauge, Layers } from 'lucide-react';

interface MetricCardsProps {
  summaries: DailyFuelSummary[];
  selectedDateSummary?: DailyFuelSummary;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  summaries,
  selectedDateSummary,
}) => {
  // Map pre-loaded spreadsheet records by date (YYYY-MM-DD and DD/MM/YYYY)
  const preloadedRecordsMap = useMemo(() => {
    const map = new Map<string, DailyConsumptionRecord>();
    DAILY_CONSUMPTION_RECORDS.forEach((r) => {
      map.set(r.isoDate, r);
      map.set(r.tanggal, r);
    });
    return map;
  }, []);

  // Aggregate period totals 100% synchronized with spreadsheet table
  let totalKonsumsi = 0;
  let totalHarga = 0;
  let totalSteam = 0;

  const fuelTotals: Record<FuelType, { konsumsi: number; hargaTotal: number }> = {
    'CANGKANG': { konsumsi: 0, hargaTotal: 0 },
    'WOOD PELLET': { konsumsi: 0, hargaTotal: 0 },
    'DUST PELLET': { konsumsi: 0, hargaTotal: 0 },
    'KOPI PELLET': { konsumsi: 0, hargaTotal: 0 },
  };

  for (const s of summaries) {
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

    const cangkangKg = useLive ? (s.breakdown['CANGKANG']?.konsumsi || 0) : (match ? match.cangkangQty : 0);
    const woodKg = useLive ? (s.breakdown['WOOD PELLET']?.konsumsi || 0) : (match ? match.woodPelletQty : 0);
    const dustKg = useLive ? (s.breakdown['DUST PELLET']?.konsumsi || 0) : (match ? match.dustPelletQty : 0);
    const kopiKg = useLive ? (s.breakdown['KOPI PELLET']?.konsumsi || 0) : (match ? match.kopiPelletQty : 0);

    const dayTotalKg = useLive
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

    const calcDayTotalHarga = cangkangCost + woodCost + dustCost + kopiCost;
    const dayTotalHarga = useLive
      ? (s.totalHarga > 0 ? s.totalHarga : calcDayTotalHarga)
      : (match ? match.totalHarga : calcDayTotalHarga);

    const steamOut = s.steamOut > 0 ? s.steamOut : (match ? match.steamOut : 0);

    totalKonsumsi += dayTotalKg;
    totalHarga += dayTotalHarga;
    totalSteam += steamOut;

    fuelTotals['CANGKANG'].konsumsi += cangkangKg;
    fuelTotals['CANGKANG'].hargaTotal += cangkangCost;
    fuelTotals['WOOD PELLET'].konsumsi += woodKg;
    fuelTotals['WOOD PELLET'].hargaTotal += woodCost;
    fuelTotals['DUST PELLET'].konsumsi += dustKg;
    fuelTotals['DUST PELLET'].hargaTotal += dustCost;
    fuelTotals['KOPI PELLET'].konsumsi += kopiKg;
    fuelTotals['KOPI PELLET'].hargaTotal += kopiCost;
  }

  const avgRpPerTonSteam = totalSteam > 0 ? totalHarga / totalSteam : 0;
  const avgKgPerTonSteam = totalSteam > 0 ? Math.round(totalKonsumsi / totalSteam) : 0;

  // Latest day values
  const latest = selectedDateSummary || summaries[summaries.length - 1];

  return (
    <div className="space-y-4">
      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Biaya */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Biaya Bahan Bakar
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CircleDollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
              {formatRupiah(totalHarga)}
            </div>
            <div className="mt-1 flex items-center text-xs text-slate-500 gap-1.5">
              <span>Hari Terakhir ({latest ? latest.displayTanggal : '-'}):</span>
              <span className="font-semibold text-slate-800 font-mono tabular-nums">
                {latest ? formatRupiah(latest.totalHarga) : 'Rp0'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Konsumsi */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Konsumsi Bahan Bakar
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
              {formatNumber(totalKonsumsi)} <span className="text-sm font-sans font-normal text-slate-500">kg</span>
            </div>
            <div className="mt-1 flex items-center text-xs text-slate-500 gap-1.5">
              <span>Setara:</span>
              <span className="font-semibold text-slate-800 font-mono tabular-nums">
                {(totalKonsumsi / 1000).toFixed(1)} Ton
              </span>
              <span>· Hari ini:</span>
              <span className="font-semibold text-slate-800 font-mono tabular-nums">
                {latest ? formatNumber(latest.totalKonsumsi) : 0} kg
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Biaya Produksi Steam */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Rata-rata Biaya Steam
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
              {formatRupiah(avgRpPerTonSteam)} <span className="text-xs font-sans font-normal text-slate-500">/ Ton Steam</span>
            </div>
            <div className="mt-1 flex items-center text-xs text-slate-500 gap-1.5">
              <span>Rasio Spesifik:</span>
              <span className="font-semibold text-slate-800 font-mono tabular-nums">
                {avgKgPerTonSteam} kg/Ton
              </span>
              <span>· Steam:</span>
              <span className="font-semibold text-slate-800 font-mono tabular-nums">
                {formatNumber(totalSteam)} Ton
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Dominasi Jenis Bahan Bakar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Jenis Bahan Bakar
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
              4 <span className="text-sm font-sans font-normal text-slate-500">Jenis Bahan Bakar</span>
            </div>
            <div className="mt-1 text-xs text-slate-500 truncate">
              Cangkang · Wood Pellet · Dust Pellet · Kopi Pellet
            </div>
          </div>
        </div>
      </div>

      {/* 4 Fuel Types Mini Summary Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Akumulasi Konsumsi & Biaya per Jenis Bahan Bakar (Periode Aktif)
          </span>
          <span className="text-xs text-slate-500">
            {summaries.length} Hari Pengamatan
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FUEL_TYPES.map((fuel) => {
            const data = fuelTotals[fuel];
            const cfg = FUEL_CONFIG[fuel];
            const shareKonsumsi = totalKonsumsi > 0 ? ((data.konsumsi / totalKonsumsi) * 100).toFixed(1) : '0';
            const shareHarga = totalHarga > 0 ? ((data.hargaTotal / totalHarga) * 100).toFixed(1) : '0';
            const avgUnitPrice = data.konsumsi > 0 ? data.hargaTotal / data.konsumsi : 0;

            return (
              <div
                key={fuel}
                className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${cfg.badgeBg}`}>
                    {fuel}
                  </span>
                  <span className="text-[11px] font-mono font-medium text-slate-500 tabular-nums">
                    {shareKonsumsi}% vol
                  </span>
                </div>

                <div className="mt-2 space-y-1">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-slate-500">Konsumsi:</span>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      {formatNumber(data.konsumsi)} kg
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-slate-500">Total Biaya:</span>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      {formatRupiah(data.hargaTotal)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <span>Rata-rata Harga:</span>
                    <span className="font-mono tabular-nums font-medium text-slate-700">
                      {avgUnitPrice > 0 ? formatRupiah(avgUnitPrice) : 'Rp0'} / kg
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
