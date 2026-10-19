import React, { useState, useEffect, useRef } from 'react';
import { FuelEntry } from '../types/boiler';
import { parseSpreadsheetText, fetchSpreadsheetContent } from '../utils/spreadsheetSync';
import {
  X,
  Radio,
  Globe,
  Link,
  Info,
  ChevronDown,
  Code2,
  Copy,
  Check,
  Upload,
  CheckCircle2,
  AlertTriangle,
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
  onApplyData?: (entries: FuelEntry[], steamData: Record<string, number>) => void;
  onResetOriginalData?: () => void;
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
  onApplyData,
  onResetOriginalData,
}) => {
  const [inputUrl, setInputUrl] = useState(sheetUrl || 'https://script.google.com/macros/s/AKfycbwtSUOi-fc4HZKMAUyr04bk');
  const [localInterval, setLocalInterval] = useState(syncIntervalSeconds || 10);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCodeExpanded, setIsCodeExpanded] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sheetUrl) {
      setInputUrl(sheetUrl);
    }
    setLocalInterval(syncIntervalSeconds || 10);
    setStatusMessage(null);
  }, [sheetUrl, syncIntervalSeconds, isOpen]);

  if (!isOpen) return null;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleConnect = async () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      setStatusMessage({ type: 'error', text: 'Masukkan tautan Google Apps Script Web App atau Google Sheets terlebih dahulu.' });
      return;
    }

    setIsConnecting(true);
    setStatusMessage(null);
    const start = Date.now();

    try {
      const text = await fetchSpreadsheetContent(trimmed);
      const duration = Date.now() - start;
      const parsed = parseSpreadsheetText(text);

      if (parsed.errors && parsed.errors.length > 0 && parsed.entries.length === 0) {
        setStatusMessage({
          type: 'error',
          text: parsed.errors[0] || 'Gagal mengenali format spreadsheet.',
        });
      } else if (parsed.entries.length === 0) {
        setStatusMessage({
          type: 'error',
          text: 'Koneksi terhubung tetapi tidak ditemukan baris data konsumsi bahan bakar yang valid. Pastikan sheet berisi kolom tanggal, konsumsi, dan harga.',
        });
      } else {
        onSaveSheetUrl(trimmed);
        if (onApplyData) {
          onApplyData(parsed.entries, parsed.steamData);
        }
        setStatusMessage({
          type: 'success',
          text: `Koneksi Berhasil! Terhubung dalam ${duration}ms, ${parsed.entries.length} baris data transaksi langsung diperbarui ke dashboard!`,
        });
        onToggleAutoSync(true, localInterval);
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Gagal terhubung ke Google Sheets. Periksa izin akses file atau URL Web App.',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = parseSpreadsheetText(text);
        if (parsed.entries.length > 0) {
          if (onApplyData) {
            onApplyData(parsed.entries, parsed.steamData);
          }
          setStatusMessage({
            type: 'success',
            text: `Berhasil mengimpor ${parsed.entries.length} baris data dari file "${file.name}"!`,
          });
        } else {
          setStatusMessage({
            type: 'error',
            text: 'File CSV tidak memuat baris data yang dapat dikenali.',
          });
        }
      } catch (err: any) {
        setStatusMessage({
          type: 'error',
          text: `Gagal membaca file CSV: ${err.message}`,
        });
      }
    };
    reader.readAsText(file);
    // Reset file input so same file can be selected again
    e.target.value = '';
  };

  const handleResetData = () => {
    if (onResetOriginalData) {
      onResetOriginalData();
      setStatusMessage({
        type: 'success',
        text: 'Data asli spreadsheet berhasil dimuat ulang ke dashboard!',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100/80 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <Radio className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Pengaturan Sinkronisasi Real-Time
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Hubungkan Google Sheet atau atur interval auto-refresh
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-800">
          
          {/* Banner: Sinkronisasi Global Terpusat (Solusi 210 vs 47 Data) */}
          <div className="border border-emerald-300 bg-emerald-50/70 rounded-xl p-4 text-emerald-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-emerald-900">
              <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Sinkronisasi Global Terpusat (Solusi 210 vs 47 Data):</span>
            </div>
            <p className="text-xs text-emerald-900/90 leading-relaxed">
              Sebelumnya, 210 data tersimpan di memori lokal (<em>localStorage</em>) laptop Anda sendiri, sehingga pengunjung lain hanya membaca data awal default (47 data).
            </p>
            <div className="text-xs text-emerald-950 font-medium leading-relaxed flex items-start gap-1.5">
              <span className="text-emerald-700 shrink-0 mt-0.5">☑️</span>
              <span>
                <strong>Sekarang Sudah Terpusat:</strong> Server backend kami menyimpan konfigurasi spreadsheet secara global. Setiap penambahan atau pengurangan baris di Google Sheet langsung terupdate serentak ke <strong>seluruh pengunjung di laptop &amp; HP manapun</strong> secara otomatis!
              </span>
            </div>
          </div>

          {/* Section 1: URL Web App Google Apps Script atau Google Sheet */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-800 tracking-wide uppercase">
              1. URL WEB APP GOOGLE APPS SCRIPT ATAU GOOGLE SHEET (CSV)
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Link className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none font-mono text-slate-800 bg-white"
                />
              </div>
              <button
                type="button"
                onClick={handleConnect}
                disabled={isConnecting || !inputUrl.trim()}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? 'Menghubungkan...' : 'Hubungkan'}
              </button>
            </div>

            {/* Status Alert if any */}
            {statusMessage && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="font-semibold leading-relaxed">{statusMessage.text}</div>
              </div>
            )}

            {/* Instructions Container */}
            <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-xl space-y-3.5 text-xs text-slate-700">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Dua Pilihan Menghubungkan Data Spreadsheet:</span>
              </div>

              {/* Pilihan 1 */}
              <div className="space-y-2">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <span className="text-blue-600">🔹</span>
                  <span>Pilihan 1 — Google Apps Script Web App URL (Rekomendasi):</span>
                </div>

                <div className="flex items-center gap-2 pl-4">
                  <button
                    type="button"
                    onClick={() => setIsGuideOpen(!isGuideOpen)}
                    className="px-2.5 py-1 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    Panduan Lengkap
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCodeExpanded(!isCodeExpanded)}
                    className="px-2.5 py-1 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>&lt;/&gt; Lihat &amp; Salin Kode</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCodeExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Collapsible Apps Script Code */}
                {isCodeExpanded && (
                  <div className="pl-4 pt-1 space-y-2">
                    <div className="flex items-center justify-between bg-slate-900 text-slate-300 px-3 py-1.5 rounded-t-lg text-[11px] font-mono">
                      <span>Code.gs (Apps Script)</span>
                      <button
                        type="button"
                        onClick={handleCopyScript}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-[10px] font-bold cursor-pointer"
                      >
                        {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCode ? 'Tersalin!' : 'Salin Semua Kode'}</span>
                      </button>
                    </div>
                    <pre className="p-3 bg-slate-950 text-emerald-300 font-mono text-[10px] rounded-b-lg max-h-48 overflow-y-auto border border-slate-800 leading-relaxed">
                      {GOOGLE_APPS_SCRIPT_CODE}
                    </pre>
                  </div>
                )}

                {/* Collapsible Full Guide */}
                {isGuideOpen && (
                  <div className="pl-4 pt-1">
                    <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg text-[11px] text-blue-950 space-y-1.5 leading-relaxed">
                      <div className="font-bold flex items-center gap-1 text-blue-900">
                        <FileCode className="w-3.5 h-3.5 text-blue-600" />
                        <span>Langkah Menghindari Error "tidak dapat disimpan / onOpen":</span>
                      </div>
                      <p>1. <strong>Jangan klik tombol "Jalankan" (Run)</strong> di editor Apps Script.</p>
                      <p>2. Tekan <strong>Ctrl + S</strong> untuk menyimpan script.</p>
                      <p>3. Klik tombol biru <strong>Deploy &gt; New deployment &gt; Web app</strong>.</p>
                      <p>4. Wajib setel <em>Who has access:</em> <strong>Anyone (Siapa saja)</strong> agar dashboard dapat membaca data tanpa error login.</p>
                    </div>
                  </div>
                )}

                <ol className="list-decimal list-outside space-y-1 text-[11px] text-slate-600 pl-8 leading-relaxed">
                  <li>Di Google Sheets &gt; <strong>Extensions</strong> &gt; <strong>Apps Script</strong> &gt; pasang kode di atas.</li>
                  <li>Klik <strong>Deploy</strong> &gt; <strong>New deployment</strong> &gt; pilih tipe <strong>Web app</strong>.</li>
                  <li>Setel <em>Execute as: Me</em> dan <em>Who has access: Anyone (Wajib Siapa Saja)</em> &gt; Klik <strong>Deploy</strong>.</li>
                  <li>Salin <strong>Web app URL</strong> (<code>https://script.google.com/macros/s/.../exec</code>) lalu tempel ke kolom di atas.</li>
                </ol>
              </div>

              <hr className="border-slate-200" />

              {/* Pilihan 2 */}
              <div className="space-y-1.5">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <span className="text-blue-600">🔹</span>
                  <span>Pilihan 2 — Google Sheet Publish to Web (CSV):</span>
                </div>
                <ol className="list-decimal list-outside space-y-1 text-[11px] text-slate-600 pl-8 leading-relaxed">
                  <li>Di Google Sheets &gt; <strong>File</strong> &gt; <strong>Share</strong> &gt; <strong>Publish to web</strong>.</li>
                  <li>Pilih tab <strong>Link</strong> &gt; pilih <strong>Comma-separated values (.csv)</strong> &gt; klik <strong>Publish</strong>.</li>
                  <li>Salin tautan CSV dan tempelkan ke kolom input di atas.</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Section 2: Frekuensi Auto-Polling Real-Time */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-800 tracking-wide uppercase">
              2. FREKUENSI AUTO-POLLING REAL-TIME
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { sec: 5, label: '5 Detik' },
                { sec: 10, label: '10 Detik' },
                { sec: 30, label: '30 Detik' },
                { sec: 60, label: '60 Detik' },
              ].map((opt) => (
                <button
                  key={opt.sec}
                  type="button"
                  onClick={() => {
                    setLocalInterval(opt.sec);
                    onToggleAutoSync(true, opt.sec);
                  }}
                  className={`py-2.5 px-2 rounded-xl text-center text-xs transition-all cursor-pointer ${
                    localInterval === opt.sec
                      ? 'border-2 border-emerald-500 bg-emerald-50/80 text-emerald-950 font-bold shadow-xs'
                      : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {autoSync && (
              <div className="text-[11px] text-slate-500 flex items-center justify-between px-1">
                <span>Status Polling: <strong className="text-emerald-700">Aktif (setiap {localInterval} detik)</strong></span>
                <span>Pemeriksaan berikutnya: <strong className="text-slate-700 font-mono">{nextSyncCountdown}s</strong></span>
              </div>
            )}
          </div>

          {/* Section 3: Impor File Spreadsheet Lokal (CSV) */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-800 tracking-wide uppercase">
              3. IMPOR FILE SPREADSHEET LOKAL (CSV)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/20 rounded-xl p-5 text-center cursor-pointer transition-all group"
            >
              <Upload className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 mx-auto mb-1.5 transition-colors" />
              <div className="font-bold text-slate-700 group-hover:text-slate-900 text-xs">
                Pilih file CSV dari komputer
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Mendukung format spreadsheet CSV
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleResetData}
            className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors cursor-pointer"
          >
            Muat Ulang Data Asli Spreadsheet
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
