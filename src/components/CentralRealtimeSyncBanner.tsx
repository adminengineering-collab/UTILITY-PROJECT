import React from 'react';
import { RefreshCw, Radio, Users, Table, CheckCircle2, Clock } from 'lucide-react';

interface CentralRealtimeSyncBannerProps {
  entriesCount: number;
  isSyncing: boolean;
  onPerformSync: () => void;
  onOpenSettings: () => void;
  lastSyncedAt?: string | null;
  sheetUrl?: string;
  isCentralConnected?: boolean;
}

export const CentralRealtimeSyncBanner: React.FC<CentralRealtimeSyncBannerProps> = ({
  entriesCount,
  isSyncing,
  onPerformSync,
  onOpenSettings,
  lastSyncedAt,
}) => {
  return (
    <div className="relative overflow-hidden rounded-xl border border-emerald-800/80 bg-gradient-to-r from-[#042017] via-[#051c14] to-[#09151e] p-4 sm:p-5 shadow-lg text-white">
      {/* Background ambient glow */}
      <div className="absolute -left-10 -top-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left Side: Status Badges and Descriptive Text */}
        <div className="space-y-2.5 max-w-4xl">
          {/* Status Badges Row matching screenshot exactly */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Sinkronisasi Real-Time Terpusat Aktif */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-900/80 text-emerald-300 border border-emerald-700/70 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span>Sinkronisasi Real-Time Terpusat Aktif</span>
            </span>

            {/* 2. Semua Pengunjung Sinkron */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800/90 text-slate-200 border border-slate-700/80 shadow-2xs">
              <Users className="w-3.5 h-3.5 text-slate-300" />
              <span>Semua Pengunjung Sinkron</span>
            </span>

            {/* 3. Dynamic Data Count: e.g. 384 Data Terbaca */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 shadow-2xs">
              <Table className="w-3.5 h-3.5 text-emerald-400" />
              <span>{entriesCount} Data Terbaca</span>
            </span>

            {lastSyncedAt && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono pl-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>Terakhir: {lastSyncedAt}</span>
              </span>
            )}
          </div>

          {/* Description Text matching user brief & screenshot 1:1 */}
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
            Data terhubung langsung dengan Google Spreadsheet. Setiap penambahan atau pengurangan baris di spreadsheet langsung terlihat oleh seluruh pengunjung secara real-time tanpa perbedaan jumlah data.
          </p>
        </div>

        {/* Right Side Action Buttons matching screenshot exactly */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Button 1: Sinkronkan Sekarang */}
          <button
            type="button"
            onClick={onPerformSync}
            disabled={isSyncing}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
            title="Tarik pembaruan data terbaru langsung dari Google Spreadsheet"
          >
            <RefreshCw className={`w-4 h-4 text-slate-950 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
          </button>

          {/* Button 2: Pengaturan Sumber Data */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white font-medium text-xs sm:text-sm shadow-2xs transition-all cursor-pointer whitespace-nowrap"
            title="Atur tautan Google Apps Script Web App atau link Google Sheets"
          >
            <Radio className="w-4 h-4 text-emerald-400" />
            <span>Pengaturan Sumber Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
