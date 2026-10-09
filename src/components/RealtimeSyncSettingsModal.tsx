import React, { useState, useEffect } from 'react';
import { FuelEntry } from '../types/boiler';
import { convertToGoogleSheetsCsvUrl, parseSpreadsheetText } from '../utils/spreadsheetSync';
import { formatNumber, formatRupiah, formatDisplayDate } from '../utils/calculations';
import {
  X,
  Settings,
  RefreshCw,
  Zap,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Bell,
  Trash2,
  Link,
  Activity,
  Code2,
  Copy,
  Check,
  FileCode,
} from 'lucide-react';
import { GOOGLE_APPS_SCRIPT_CODE } from '../utils/googleAppsScriptCode';

export interface SyncLogItem {
  id: string;
  timestamp: string;
  status: 'success' | 'error';
  message: string;
  rowCount?: number;
  durationMs?: number;
}

interface RealtimeSyncSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetUrl: string;
  onSaveSheetUrl: (url: string) => void;
  autoSync: boolean;
  onToggleAutoSync: (enabled: boolean, intervalSeconds: number) => void;
  syncIntervalSeconds: number;
  lastSyncedAt: string | null;
  onForceSyncNow: () => Promise<void>;
  isSyncing: boolean;
  syncLogs: SyncLogItem[];
  nextSyncCountdown: number;
  notifyOnDataChange: boolean;
  onToggleNotify: (enabled: boolean) => void;
  mergeMode: 'replace' | 'merge';
  onSetMergeMode: (mode: 'replace' | 'merge') => void;
}

export const RealtimeSyncSettingsModal: React.FC<RealtimeSyncSettingsModalProps> = ({
  isOpen,
  onClose,
  sheetUrl,
  onSaveSheetUrl,
  autoSync,
  onToggleAutoSync,
  syncIntervalSeconds,
  lastSyncedAt,
  onForceSyncNow,
  isSyncing,
  syncLogs,
  nextSyncCountdown,
  notifyOnDataChange,
  onToggleNotify,
  mergeMode,
  onSetMergeMode,
}) => {
  const [inputUrl, setInputUrl] = useState(sheetUrl);
  const [localAutoSync, setLocalAutoSync] = useState(autoSync);
  const [localInterval, setLocalInterval] = useState(syncIntervalSeconds);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; rows?: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'connection' | 'appscript'>('connection');
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    setInputUrl(sheetUrl);
    setLocalAutoSync(autoSync);
    setLocalInterval(syncIntervalSeconds);
    setTestResult(null);
  }, [sheetUrl, autoSync, syncIntervalSeconds, isOpen]);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  if (!isOpen) return null;

  // Test Connection
  const handleTestConnection = async () => {
    if (!inputUrl.trim()) {
      setTestResult({ success: false, message: 'Masukkan tautan Google Sheets terlebih dahulu.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    const start = Date.now();

    try {
      const csvUrl = convertToGoogleSheetsCsvUrl(inputUrl);
      let response: Response;
      try {
        // Add cache buster
        const testUrlWithCacheBuster = `${csvUrl}${csvUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`;
        response = await fetch(testUrlWithCacheBuster, { cache: 'no-store' });
      } catch {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(csvUrl)}&_t=${Date.now()}`;
        response = await fetch(proxyUrl, { cache: 'no-store' });
      }

      if (!response.ok) {
        throw new Error(`Server Google Sheets merespons dengan status ${response.status}. Periksa izin berbagi file.`);
      }

      const text = await response.text();
      const duration = Date.now() - start;
      const parsed = parseSpreadsheetText(text);

      if (parsed.entries.length === 0) {
        setTestResult({
          success: false,
          message: 'Koneksi terhubung namun tidak ditemukan baris data konsumsi bahan bakar yang valid.',
        });
      } else {
        setTestResult({
          success: true,
          message: `Koneksi Berhasil! Terhubung dalam ${duration}ms, terdeteksi ${parsed.entries.length} baris transaksi valid.`,
          rows: parsed.entries.length,
        });
        onSaveSheetUrl(inputUrl);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Gagal terhubung ke Google Sheets. Pastikan akses disetel ke "Anyone with link can view".',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveSettings = () => {
    onSaveSheetUrl(inputUrl);
    onToggleAutoSync(localAutoSync, localInterval);
    onClose();
  };

  const handleDisconnect = () => {
    if (window.confirm('Putuskan tautan Google Sheets? Fitur real-time sync akan dinonaktifkan.')) {
      onSaveSheetUrl('');
      setInputUrl('');
      onToggleAutoSync(false, localInterval);
      setTestResult(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
                <span>Pengaturan Sinkronisasi Real-Time</span>
                {autoSync ? (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE ON ({syncIntervalSeconds}s)
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    NONAKTIF
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Konfigurasi pembaruan otomatis dari Google Spreadsheet secara berkala
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 pt-2 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('connection')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'connection'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-600" />
            <span>Koneksi &amp; Sinkronisasi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('appscript')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'appscript'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Kode Apps Script (Code.gs)</span>
            <span className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-amber-100 text-amber-800 font-bold border border-amber-300">
              Baru
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {activeTab === 'appscript' ? (
            <div className="space-y-4">
              {/* Tutorial Steps Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-950 space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                  <FileCode className="w-4 h-4 text-amber-700" />
                  <span>Panduan Memasang Google Apps Script (Code.gs)</span>
                </div>
                <div className="text-[11px] text-amber-900/90 leading-relaxed space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                    <span>Buka Google Sheets data boiler Anda &gt; klik menu <strong>Ekstensi (Extensions)</strong> &gt; pilih <strong>Apps Script</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                    <span>Hapus kode bawaan di file <code>Code.gs</code>, lalu klik tombol <strong>"Salin Semua Kode"</strong> di bawah dan tempelkan.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                    <span>Klik <strong>Simpan (Save / ikon disket)</strong>, lalu klik tombol biru <strong>Deploy &gt; New deployment (Deployment baru)</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-[10px] shrink-0">4</span>
                    <span>Pilih tipe <strong>Web app</strong>. Atur <em>Execute as:</em> <strong>Me (Saya)</strong> dan <em>Who has access:</em> <strong>Anyone (Siapa saja)</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-[10px] shrink-0">5</span>
                    <span>Klik <strong>Deploy</strong>, lalu salin URL Web App yang dihasilkan (akhiran <code>/exec</code>) dan masukkan ke tab <strong>Koneksi &amp; Sinkronisasi</strong>.</span>
                  </div>
                </div>
              </div>

              {/* Code viewer header & copy action */}
              <div className="border border-slate-700/80 rounded-xl overflow-hidden bg-slate-950 text-slate-100 shadow-lg">
                <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    <span className="font-mono text-xs text-slate-300 ml-2 font-semibold">Code.gs (Google Apps Script)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      copiedCode
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700'
                    }`}
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Berhasil Disalin!' : 'Salin Semua Kode'}</span>
                  </button>
                </div>

                <div className="p-3.5 max-h-[380px] overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-200 select-all">
                  <pre className="whitespace-pre-wrap">{GOOGLE_APPS_SCRIPT_CODE}</pre>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Sinkronisasi Otomatis</span>
                  </div>
                  <div className="text-slate-600">
                    Menyediakan API JSON berkecepatan tinggi tanpa hambatan otorisasi publik.
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Menu Khusus di Sheet</span>
                  </div>
                  <div className="text-slate-600">
                    Menambahkan menu "Boiler Utility TACO" untuk auto-template dan hitung formula.
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Validasi Multi-Bahan</span>
                  </div>
                  <div className="text-slate-600">
                    Mendukung Cangkang, Wood Pellet, Dust Pellet, dan Kopi Pellet.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Section 1: Real-Time Toggle & Interval */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      localAutoSync ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                    }`}>
                      <Radio className={`w-4 h-4 ${localAutoSync ? 'animate-pulse text-emerald-600' : ''}`} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">
                        Sinkronisasi Real-Time Otomatis
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Memantau Google Sheets secara terus menerus dan memperbarui dashboard seketika.
                      </div>
                    </div>
                  </div>

                  {/* Master Switch */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={localAutoSync}
                      onChange={(e) => setLocalAutoSync(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Interval Options */}
                {localAutoSync && (
                  <div className="pt-3 border-t border-slate-200/80 space-y-2">
                    <label className="block font-semibold text-slate-700 text-xs">
                      Interval Pembaruan Real-Time:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { sec: 10, label: '10 Detik', badge: 'Ultra Cepat' },
                        { sec: 30, label: '30 Detik', badge: 'Disarankan' },
                        { sec: 60, label: '1 Menit', badge: 'Standar' },
                        { sec: 300, label: '5 Menit', badge: 'Hemat Data' },
                      ].map((opt) => (
                        <button
                          key={opt.sec}
                          type="button"
                          onClick={() => setLocalInterval(opt.sec)}
                          className={`p-2.5 rounded-lg border text-left transition-all ${
                            localInterval === opt.sec
                              ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 font-bold ring-1 ring-emerald-500'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{opt.label}</span>
                            {localInterval === opt.sec && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal mt-0.5">{opt.badge}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Live Indicator Countdown */}
                {autoSync && sheetUrl && (
                  <div className="flex items-center justify-between pt-2 text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/70">
                    <div className="flex items-center gap-1.5 font-mono">
                      <Clock className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                      <span>Update berikutnya dalam: <strong className="text-emerald-700 font-bold">{nextSyncCountdown} detik</strong></span>
                    </div>
                    <div className="text-slate-400">
                      Terakhir: <span className="font-semibold text-slate-700">{lastSyncedAt || '-'}</span>
                    </div>
                  </div>
                )}
              </div>

          {/* Section 2: Google Sheets URL Setup */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tautan Dokumen Google Sheets</span>
              </label>
              {sheetUrl && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="text-rose-600 hover:text-rose-700 text-[11px] font-medium flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Putuskan Tautan</span>
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !inputUrl.trim()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg shadow-xs transition-colors whitespace-nowrap disabled:opacity-50"
              >
                <Activity className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Menguji...' : 'Uji Koneksi'}</span>
              </button>
            </div>

            {/* Test result message */}
            {testResult && (
              <div
                className={`p-3 rounded-lg border text-[11px] flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>{testResult.message}</div>
              </div>
            )}
          </div>

          {/* Section 3: Synchronization Behaviors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Merge Strategy */}
            <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 space-y-1.5">
              <div className="font-semibold text-slate-800">Strategi Sinkronisasi:</div>
              <div className="space-y-1">
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="radio"
                    name="modalMergeMode"
                    checked={mergeMode === 'replace'}
                    onChange={() => onSetMergeMode('replace')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Gantikan Seluruh Data (Selalu cocok dengan Sheet)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="radio"
                    name="modalMergeMode"
                    checked={mergeMode === 'merge'}
                    onChange={() => onSetMergeMode('merge')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Gabungkan Data Baru (Append Mode)</span>
                </label>
              </div>
            </div>

            {/* Notification toggle */}
            <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 space-y-1.5">
              <div className="font-semibold text-slate-800">Notifikasi Real-Time:</div>
              <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                <input
                  type="checkbox"
                  checked={notifyOnDataChange}
                  onChange={(e) => onToggleNotify(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Tampilkan notifikasi toast saat ada baris data baru</span>
              </label>
              <div className="text-[10px] text-slate-500">
                Membantu memantau operator saat menginput penerimaan bahan bakar di pabrik.
              </div>
            </div>
          </div>

          {/* Section 4: Live Sync Logs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800">Riwayat Sinkronisasi Real-Time (Log):</span>
              <span className="text-[11px] text-slate-400 font-mono">
                {syncLogs.length} aktivitas tercatat
              </span>
            </div>

            <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg bg-slate-900 text-slate-200 p-2.5 font-mono text-[11px] space-y-1">
              {syncLogs.length === 0 ? (
                <div className="text-slate-500 text-center py-3 font-sans">
                  Belum ada aktivitas sinkronisasi. Aktifkan real-time sync atau tekan "Sinkronkan Sekarang".
                </div>
              ) : (
                syncLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-0.5 border-b border-slate-800/60">
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-slate-500">[{log.timestamp}]</span>
                      <span className={log.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}>
                        {log.status === 'success' ? '● SYNC OK' : '✕ FAILED'}
                      </span>
                      <span className="text-slate-300 truncate">{log.message}</span>
                    </div>
                    {log.durationMs !== undefined && (
                      <span className="text-slate-500 text-[10px] shrink-0 pl-2">{log.durationMs}ms</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {sheetUrl && (
              <button
                type="button"
                onClick={() => onForceSyncNow()}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg transition-colors font-medium"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
            >
              Simpan Pengaturan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
