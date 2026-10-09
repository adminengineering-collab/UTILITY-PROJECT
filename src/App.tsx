import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { FuelEntry, DailyFuelSummary } from './types/boiler';
import { INITIAL_ENTRIES, INITIAL_STEAM_DATA } from './data/initialData';
import { calculateDailySummaries, formatDisplayDate, parseDateToIso } from './utils/calculations';
import { convertToGoogleSheetsCsvUrl, parseSpreadsheetText } from './utils/spreadsheetSync';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { DailyCostBreakdown } from './components/DailyCostBreakdown';
import { ChartsSection } from './components/ChartsSection';
import { SpreadsheetTable } from './components/SpreadsheetTable';
import { AddRecordModal } from './components/AddRecordModal';
import { AuditExportModal } from './components/AuditExportModal';
import { RealtimeSyncSettingsModal, SyncLogItem } from './components/RealtimeSyncSettingsModal';
import { exportDetailToCsv } from './utils/exportCsv';
import { Filter, RotateCcw, CheckCircle, Radio, Calendar, X } from 'lucide-react';

const STORAGE_KEY_ENTRIES = 'boiler_fuel_entries_v2_feb2026';
const STORAGE_KEY_STEAM = 'boiler_steam_data_v2_feb2026';
const STORAGE_KEY_SHEET_URL = 'boiler_sheet_url_v1';
const STORAGE_KEY_LAST_SYNCED = 'boiler_last_synced_v1';
const STORAGE_KEY_AUTO_SYNC = 'boiler_auto_sync_v1';
const STORAGE_KEY_SYNC_INTERVAL_SEC = 'boiler_sync_interval_sec_v1';
const STORAGE_KEY_MERGE_MODE = 'boiler_merge_mode_v1';
const STORAGE_KEY_NOTIFY = 'boiler_notify_change_v1';

export default function App() {
  // Persistent State or Initial Seed Data
  const [entries, setEntries] = useState<FuelEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ENTRIES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_ENTRIES;
  });

  const [steamData, setSteamData] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STEAM);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_STEAM_DATA;
  });

  // Real-Time Spreadsheet Sync State
  const [sheetUrl, setSheetUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_SHEET_URL) || '';
    } catch {
      return '';
    }
  });

  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_LAST_SYNCED) || null;
    } catch {
      return null;
    }
  });

  const [autoSync, setAutoSync] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_AUTO_SYNC) === 'true';
    } catch {
      return false;
    }
  });

  const [syncIntervalSeconds, setSyncIntervalSeconds] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SYNC_INTERVAL_SEC);
      return saved ? parseInt(saved, 10) : 30; // 30 seconds default
    } catch {
      return 30;
    }
  });

  const [mergeMode, setMergeMode] = useState<'replace' | 'merge'>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY_MERGE_MODE) as 'replace' | 'merge') || 'replace';
    } catch {
      return 'replace';
    }
  });

  const [notifyOnDataChange, setNotifyOnDataChange] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_NOTIFY) !== 'false';
    } catch {
      return true;
    }
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isRealtimeModalOpen, setIsRealtimeModalOpen] = useState<boolean>(false);
  const [nextSyncCountdown, setNextSyncCountdown] = useState<number>(syncIntervalSeconds);
  const [syncLogs, setSyncLogs] = useState<SyncLogItem[]>([]);

  // Ref to track previous count/total for change notifications
  const prevEntryCountRef = useRef(entries.length);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
      localStorage.setItem(STORAGE_KEY_STEAM, JSON.stringify(steamData));
      localStorage.setItem(STORAGE_KEY_SHEET_URL, sheetUrl);
      if (lastSyncedAt) localStorage.setItem(STORAGE_KEY_LAST_SYNCED, lastSyncedAt);
      localStorage.setItem(STORAGE_KEY_AUTO_SYNC, autoSync ? 'true' : 'false');
      localStorage.setItem(STORAGE_KEY_SYNC_INTERVAL_SEC, syncIntervalSeconds.toString());
      localStorage.setItem(STORAGE_KEY_MERGE_MODE, mergeMode);
      localStorage.setItem(STORAGE_KEY_NOTIFY, notifyOnDataChange ? 'true' : 'false');
    } catch (e) {
      console.error(e);
    }
  }, [entries, steamData, sheetUrl, lastSyncedAt, autoSync, syncIntervalSeconds, mergeMode, notifyOnDataChange]);

  // Tab State - Clean 4 tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'daily_breakdown' | 'spreadsheet'>('overview');

  // Filter State
  const [dateFilterPreset, setDateFilterPreset] = useState<'ALL' | 'LATEST' | 'LAST7' | 'CUSTOM'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FuelEntry | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Distinct suppliers for dropdowns
  const existingSuppliers = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => set.add(e.namaPt));
    return Array.from(set).sort();
  }, [entries]);

  // Compute sorted unique normalized ISO dates
  const uniqueDates = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      const iso = parseDateToIso(e.tanggal);
      if (iso) set.add(iso);
    });
    return Array.from(set).sort();
  }, [entries]);

  const minAvailableDate = uniqueDates.length > 0 ? uniqueDates[0] : '';
  const maxAvailableDate = uniqueDates.length > 0 ? uniqueDates[uniqueDates.length - 1] : '';

  // Filter entries according to date filter
  const filteredEntries = useMemo(() => {
    if (dateFilterPreset === 'LATEST' && uniqueDates.length > 0) {
      const latestDate = uniqueDates[uniqueDates.length - 1];
      return entries.filter((e) => parseDateToIso(e.tanggal) === latestDate);
    }

    if (dateFilterPreset === 'LAST7' && uniqueDates.length > 0) {
      const recentDates = uniqueDates.slice(-7);
      return entries.filter((e) => recentDates.includes(parseDateToIso(e.tanggal)));
    }

    if (startDate || endDate) {
      return entries.filter((e) => {
        const iso = parseDateToIso(e.tanggal);
        if (startDate && iso < startDate) return false;
        if (endDate && iso > endDate) return false;
        return true;
      });
    }

    return entries;
  }, [entries, dateFilterPreset, uniqueDates, startDate, endDate]);

  // Calculate daily summaries for the active dataset
  const summaries = useMemo(() => {
    return calculateDailySummaries(filteredEntries, steamData);
  }, [filteredEntries, steamData]);

  // Handlers for Add / Edit
  const handleSaveEntry = (entryData: Partial<FuelEntry>, newSteamOut?: number) => {
    if (editingEntry) {
      setEntries((prev) =>
        prev.map((e) => (e.id === editingEntry.id ? ({ ...e, ...entryData } as FuelEntry) : e))
      );
      showToast('Baris data berhasil diperbarui.');
    } else {
      const newEntry: FuelEntry = {
        id: `entry-${Date.now()}`,
        no: entries.length + 1,
        namaPt: entryData.namaPt || 'SUPPLIER',
        bahanBakar: entryData.bahanBakar || 'WOOD PELLET',
        tanggal: entryData.tanggal || new Date().toISOString().slice(0, 10),
        mc: entryData.mc || 0,
        calori: entryData.calori || null,
        konsumsi: entryData.konsumsi || 0,
        harga: entryData.harga || 0,
        totalHarga: entryData.totalHarga || (entryData.konsumsi || 0) * (entryData.harga || 0),
      };
      setEntries((prev) => [...prev, newEntry]);
      showToast('Data pemakaian bahan bakar berhasil dicatat.');
    }

    if (entryData.tanggal && newSteamOut !== undefined) {
      setSteamData((prev) => ({
        ...prev,
        [entryData.tanggal!]: newSteamOut,
      }));
    }

    setEditingEntry(null);
  };

  const handleDeleteEntry = (id: string) => {
    if (window.confirm('Yakin ingin menghapus baris data transaksi ini?')) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      showToast('Baris transaksi telah dihapus.');
    }
  };

  const handleEditEntry = (entry: FuelEntry) => {
    setEditingEntry(entry);
    setIsAddModalOpen(true);
  };

  const handleImportCsv = (imported: FuelEntry[], newSteam: Record<string, number>) => {
    setEntries((prev) => [...prev, ...imported]);
    if (Object.keys(newSteam).length > 0) {
      setSteamData((prev) => ({ ...prev, ...newSteam }));
    }
    showToast(`Berhasil mengimpor ${imported.length} baris data dari CSV!`);
  };

  const handleUpdateEntryDate = (id: string, newDate: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, tanggal: newDate } : e))
    );
    showToast(`Tanggal baris berhasil disesuaikan menjadi ${formatDisplayDate(newDate)}.`);
  };

  // REAL-TIME SYNC EXECUTION ENGINE
  const handlePerformSync = useCallback(async () => {
    if (!sheetUrl.trim()) return;

    setIsSyncing(true);
    const startTime = Date.now();
    const timeFormatted = new Date().toLocaleTimeString('id-ID');

    try {
      const baseCsvUrl = convertToGoogleSheetsCsvUrl(sheetUrl);
      // Cache buster for real-time freshness
      const csvUrlWithCacheBuster = `${baseCsvUrl}${baseCsvUrl.includes('?') ? '&' : '?'}_nocache=${Date.now()}`;

      let response: Response;
      try {
        response = await fetch(csvUrlWithCacheBuster, { cache: 'no-store' });
      } catch {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(csvUrlWithCacheBuster)}`;
        response = await fetch(proxyUrl, { cache: 'no-store' });
      }

      if (!response.ok) {
        throw new Error(`Koneksi Google Sheets gagal (Status ${response.status}).`);
      }

      const text = await response.text();
      const parseResult = parseSpreadsheetText(text);

      if (parseResult.entries.length === 0) {
        throw new Error('Tidak ada baris data valid yang terbaca dari spreadsheet.');
      }

      const durationMs = Date.now() - startTime;

      // Check if data changed
      const previousCount = prevEntryCountRef.current;
      const newCount = parseResult.entries.length;
      const countDelta = newCount - previousCount;

      if (mergeMode === 'replace') {
        setEntries(parseResult.entries);
      } else {
        setEntries((prev) => [...prev, ...parseResult.entries]);
      }

      if (Object.keys(parseResult.steamData).length > 0) {
        setSteamData((prev) => ({ ...prev, ...parseResult.steamData }));
      }

      // Auto-align date filter range with the connected spreadsheet
      if (parseResult.summary.datesFound.length > 0) {
        const dates = parseResult.summary.datesFound;
        setDateFilterPreset('ALL');
        setStartDate(dates[0]);
        setEndDate(dates[dates.length - 1]);
      }

      prevEntryCountRef.current = newCount;

      const timestamp = new Date().toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLastSyncedAt(timestamp);

      // Add to log
      const newLog: SyncLogItem = {
        id: `log-${Date.now()}`,
        timestamp: timeFormatted,
        status: 'success',
        message: `${newCount} baris tersinkronkan (${countDelta > 0 ? `+${countDelta} baris baru` : 'update'})`,
        rowCount: newCount,
        durationMs,
      };
      setSyncLogs((prev) => [newLog, ...prev.slice(0, 19)]);

      showToast(`Real-Time Sync Berhasil: ${newCount} baris data diperbarui dari Google Sheets!`);
    } catch (err: any) {
      console.error('Realtime sync error:', err);
      const newLog: SyncLogItem = {
        id: `log-${Date.now()}`,
        timestamp: timeFormatted,
        status: 'error',
        message: err.message || 'Gagal tersinkronisasi',
      };
      setSyncLogs((prev) => [newLog, ...prev.slice(0, 19)]);
      showToast(`Gagal Sinkronisasi: ${err.message || 'Periksa koneksi Google Sheets'}`);
    } finally {
      setIsSyncing(false);
      setNextSyncCountdown(syncIntervalSeconds);
    }
  }, [sheetUrl, mergeMode, syncIntervalSeconds, showToast]);

  const handleResetData = () => {
    if (window.confirm('Reset data ke default awal (sesuai template spreadsheet asli)?')) {
      setEntries(INITIAL_ENTRIES);
      setSteamData(INITIAL_STEAM_DATA);
      setDateFilterPreset('ALL');
      setStartDate('');
      setEndDate('');
      showToast('Data berhasil di-reset ke template spreadsheet awal.');
    }
  };

  const handleAlignDatesWithSheet = () => {
    if (uniqueDates.length > 0) {
      setDateFilterPreset('ALL');
      setStartDate(uniqueDates[0]);
      setEndDate(uniqueDates[uniqueDates.length - 1]);
      showToast(`Rentang tanggal disesuaikan dengan spreadsheet: ${formatDisplayDate(uniqueDates[0])} s/d ${formatDisplayDate(uniqueDates[uniqueDates.length - 1])}`);
    }
  };

  // Period label
  const periodText = useMemo(() => {
    if (summaries.length === 0) return 'Tidak ada data';
    if (summaries.length === 1) return `Tanggal ${summaries[0].displayTanggal}`;
    return `${summaries[0].displayTanggal} s/d ${summaries[summaries.length - 1].displayTanggal}`;
  }, [summaries]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2 text-xs animate-in slide-in-from-bottom duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={() => {
          setEditingEntry(null);
          setIsAddModalOpen(true);
        }}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenRealtimeSettings={() => setIsRealtimeModalOpen(true)}
        onPerformSync={handlePerformSync}
        isSyncing={isSyncing}
        hasGoogleSheetConnected={Boolean(sheetUrl)}
        lastSyncedAt={lastSyncedAt}
        autoSync={autoSync}
        syncIntervalSeconds={syncIntervalSeconds}
        dateRangeText={periodText}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Global Filter Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mr-1">
              <Filter className="w-3.5 h-3.5 text-amber-500" />
              <span>Filter Periode:</span>
            </span>

            {/* Presets */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                onClick={() => {
                  setDateFilterPreset('ALL');
                  setStartDate('');
                  setEndDate('');
                }}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  dateFilterPreset === 'ALL' && !startDate && !endDate
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Data
              </button>
              <button
                onClick={() => {
                  setDateFilterPreset('LAST7');
                  setStartDate('');
                  setEndDate('');
                }}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  dateFilterPreset === 'LAST7'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                7 Hari Terakhir
              </button>
              <button
                onClick={() => {
                  setDateFilterPreset('LATEST');
                  setStartDate('');
                  setEndDate('');
                }}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  dateFilterPreset === 'LATEST'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hari Terakhir
              </button>
            </div>

            {/* Custom Date Pickers */}
            <div className="flex items-center gap-1.5 text-xs">
              <input
                type="date"
                value={startDate}
                min={minAvailableDate}
                max={maxAvailableDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDateFilterPreset('CUSTOM');
                }}
                className="px-2 py-1 border border-slate-300 rounded text-slate-700 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                title={`Tanggal Mulai (Data: ${formatDisplayDate(minAvailableDate)} - ${formatDisplayDate(maxAvailableDate)})`}
              />
              <span className="text-slate-400 font-medium">-</span>
              <input
                type="date"
                value={endDate}
                min={minAvailableDate}
                max={maxAvailableDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDateFilterPreset('CUSTOM');
                }}
                className="px-2 py-1 border border-slate-300 rounded text-slate-700 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                title={`Tanggal Selesai (Data: ${formatDisplayDate(minAvailableDate)} - ${formatDisplayDate(maxAvailableDate)})`}
              />
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setDateFilterPreset('ALL');
                  }}
                  className="px-2 py-1 text-xs text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 flex items-center gap-1 transition-colors"
                  title="Hapus filter rentang tanggal"
                >
                  <X className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Right info / reset */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-mono">
              Periode: <strong className="text-slate-800">{periodText}</strong> ({summaries.length} hari · {filteredEntries.length} transaksi)
            </span>

            <button
              onClick={handleResetData}
              className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors"
              title="Reset ke data awal spreadsheet"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reset Template</span>
            </button>
          </div>
        </div>

        {/* Empty filter result warning */}
        {summaries.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Tidak ada data untuk rentang tanggal yang dipilih</h4>
              <p className="text-xs text-slate-600 mt-1">
                Data transaksi yang tersimpan berada di rentang tanggal {formatDisplayDate(minAvailableDate)} s/d {formatDisplayDate(maxAvailableDate)}.
              </p>
            </div>
            <button
              onClick={() => {
                setDateFilterPreset('ALL');
                setStartDate('');
                setEndDate('');
              }}
              className="px-3.5 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg transition-colors shadow-xs"
            >
              Tampilkan Semua Data
            </button>
          </div>
        )}

        {/* TAB 1: OVERVIEW / RINGKASAN EKSEKUTIF */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <MetricCards summaries={summaries} />
            <ChartsSection summaries={summaries} />
            <DailyCostBreakdown summaries={summaries} />
          </div>
        )}

        {/* TAB 2: INTERACTIVE CHARTS */}
        {activeTab === 'charts' && (
          <div className="space-y-6">
            <ChartsSection summaries={summaries} />
            <DailyCostBreakdown summaries={summaries} />
          </div>
        )}

        {/* TAB 3: DAILY CONSUMPTION & COST MATRIX */}
        {activeTab === 'daily_breakdown' && (
          <div className="space-y-6">
            <MetricCards summaries={summaries} />
            <DailyCostBreakdown summaries={summaries} />
          </div>
        )}

        {/* TAB 4: SPREADSHEET TABLE (NEW FORMAT MATCHING SPREADSHEET OPERASIONAL) */}
        {activeTab === 'spreadsheet' && (
          <div className="space-y-6">
            <SpreadsheetTable
              summaries={summaries}
              entries={filteredEntries}
              steamDataMap={steamData}
              onOpenRealtimeSettings={() => setIsRealtimeModalOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            TACO Group Engineering & Boiler Utility Monitoring · Biomass Fuel Management System
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span>Standar Audit ISO 50001</span>
            <span>·</span>
            <span>Cangkang Sawit · Wood Pellet · Dust Pellet · Kopi Pellet</span>
          </div>
        </div>
      </footer>

      {/* Add / Edit Record Modal */}
      <AddRecordModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingEntry(null);
        }}
        onSave={handleSaveEntry}
        editingEntry={editingEntry}
        currentSteamOut={editingEntry ? steamData[editingEntry.tanggal] : undefined}
        existingSuppliers={existingSuppliers}
      />

      {/* Audit Export Modal */}
      <AuditExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        summaries={summaries}
        entries={filteredEntries}
        steamDataMap={steamData}
      />

      {/* Real-time Sync Settings Modal */}
      <RealtimeSyncSettingsModal
        isOpen={isRealtimeModalOpen}
        onClose={() => setIsRealtimeModalOpen(false)}
        sheetUrl={sheetUrl}
        onSaveSheetUrl={setSheetUrl}
        autoSync={autoSync}
        onToggleAutoSync={(enabled, intervalSec) => {
          setAutoSync(enabled);
          setSyncIntervalSeconds(intervalSec);
          setNextSyncCountdown(intervalSec);
          showToast(`Sinkronisasi real-time ${enabled ? `diaktifkan (setiap ${intervalSec} detik)` : 'dinonaktifkan'}.`);
        }}
        syncIntervalSeconds={syncIntervalSeconds}
        lastSyncedAt={lastSyncedAt}
        onForceSyncNow={handlePerformSync}
        isSyncing={isSyncing}
        syncLogs={syncLogs}
        nextSyncCountdown={nextSyncCountdown}
        notifyOnDataChange={notifyOnDataChange}
        onToggleNotify={setNotifyOnDataChange}
        mergeMode={mergeMode}
        onSetMergeMode={setMergeMode}
      />
    </div>
  );
}
