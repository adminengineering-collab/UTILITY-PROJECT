import React from 'react';
import { Plus, FileDown, Flame, Settings, RefreshCw } from 'lucide-react';

interface HeaderProps {
  activeTab: 'overview' | 'charts' | 'daily_breakdown' | 'spreadsheet';
  setActiveTab: (tab: 'overview' | 'charts' | 'daily_breakdown' | 'spreadsheet') => void;
  onOpenAddModal: () => void;
  onOpenExportModal: () => void;
  onOpenRealtimeSettings: () => void;
  onPerformSync: () => void;
  isSyncing: boolean;
  hasGoogleSheetConnected: boolean;
  lastSyncedAt: string | null;
  autoSync: boolean;
  syncIntervalSeconds: number;
  dateRangeText: string;
  nextSyncCountdown?: number;
  onToggleAutoSyncQuick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddModal,
  onOpenExportModal,
  onOpenRealtimeSettings,
  onPerformSync,
  isSyncing,
  hasGoogleSheetConnected,
  lastSyncedAt,
  autoSync,
  syncIntervalSeconds,
  nextSyncCountdown = 15,
  onToggleAutoSyncQuick,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Single text element brand wordmark */}
          <div className="flex items-center gap-3">
            <div className="h-9 px-2.5 rounded-lg bg-white/95 border border-slate-700/60 flex items-center justify-center shadow-sm">
              <img
                src="/taco-logo.svg"
                alt="TACO Logo"
                className="h-6 w-auto object-contain max-w-[90px]"
              />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>Monitoring Konsumsi &amp; Biaya Bahan Bakar</span>
              </div>
              <div className="text-[11px] text-slate-400 hidden md:block">
                Sistem Pemantauan Bahan Bakar Boiler
              </div>
            </div>
          </div>

          {/* Zone 2: Navigation Links (Only 4 core tabs as requested) */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/50">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Ringkasan & KPI
            </button>
            <button
              onClick={() => setActiveTab('charts')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                activeTab === 'charts'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Grafik Interaktif
            </button>
            <button
              onClick={() => setActiveTab('daily_breakdown')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                activeTab === 'daily_breakdown'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Biaya & Konsumsi Harian
            </button>
            <button
              onClick={() => setActiveTab('spreadsheet')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                activeTab === 'spreadsheet'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Data Spreadsheet
            </button>
          </nav>

          {/* Zone 3: Primary Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Button 1: Dedicated Real-time Sync Button */}
            <button
              onClick={() => {
                if (hasGoogleSheetConnected) {
                  onPerformSync();
                } else {
                  onOpenRealtimeSettings();
                }
              }}
              disabled={isSyncing}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-lg transition-all whitespace-nowrap shadow-sm active:scale-95 ${
                hasGoogleSheetConnected
                  ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-600/80 text-emerald-300 ring-1 ring-emerald-500/40 hover:text-white'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              } ${isSyncing ? 'opacity-80 cursor-wait' : ''}`}
              title={
                hasGoogleSheetConnected
                  ? `Klik untuk sinkronisasi data langsung dari Google Sheets (Terakhir: ${lastSyncedAt || 'Belum ada'})`
                  : 'Hubungkan tautan Google Sheets untuk sinkronisasi'
              }
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`}
              />
              <span className="font-sans">
                {isSyncing ? 'Menyinkronkan...' : 'Real Time Sync'}
              </span>
            </button>

            {/* Real-time Settings button */}
            <button
              onClick={onOpenRealtimeSettings}
              className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
              title="Pengaturan URL Google Sheets"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onOpenExportModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shadow-sm"
              title="Ekspor laporan audit PDF dan CSV"
            >
              <FileDown className="w-3.5 h-3.5 text-amber-400" />
              <span>Ekspor Audit</span>
            </button>

            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shadow-sm"
              title="Catat penerimaan atau pemakaian bahan bakar"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Catat</span>
            </button>
          </div>
        </div>

        {/* Mobile View Navigation */}
        <div className="lg:hidden flex items-center justify-between py-2 border-t border-slate-800 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
              activeTab === 'overview' ? 'bg-amber-500 text-slate-950' : 'text-slate-300'
            }`}
          >
            Ringkasan
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
              activeTab === 'charts' ? 'bg-amber-500 text-slate-950' : 'text-slate-300'
            }`}
          >
            Grafik
          </button>
          <button
            onClick={() => setActiveTab('daily_breakdown')}
            className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
              activeTab === 'daily_breakdown' ? 'bg-amber-500 text-slate-950' : 'text-slate-300'
            }`}
          >
            Konsumsi & Biaya
          </button>
          <button
            onClick={() => setActiveTab('spreadsheet')}
            className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
              activeTab === 'spreadsheet' ? 'bg-amber-500 text-slate-950' : 'text-slate-300'
            }`}
          >
            Spreadsheet
          </button>
          <button
            onClick={onOpenRealtimeSettings}
            className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap flex items-center gap-1 ${
              autoSync && hasGoogleSheetConnected
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'text-slate-300'
            }`}
          >
            <Settings className="w-3 h-3 text-emerald-400" />
            <span>Pengaturan Sync</span>
          </button>
        </div>
      </div>
    </header>
  );
};
