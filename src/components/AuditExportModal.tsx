import React, { useState } from 'react';
import { DailyFuelSummary, FuelEntry } from '../types/boiler';
import { exportAuditReportPdf } from '../utils/exportPdf';
import { exportDetailToCsv, exportDailySummaryToCsv } from '../utils/exportCsv';
import { X, FileText, Table, CheckCircle2, ShieldCheck, Printer } from 'lucide-react';

interface AuditExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaries: DailyFuelSummary[];
  entries: FuelEntry[];
  steamDataMap: Record<string, number>;
}

export const AuditExportModal: React.FC<AuditExportModalProps> = ({
  isOpen,
  onClose,
  summaries,
  entries,
  steamDataMap,
}) => {
  const [companyName, setCompanyName] = useState('PT TACO INDONESIA');
  const [department, setDepartment] = useState('Divisi Engineering & Utilitas Boiler');
  const [auditorName, setAuditorName] = useState('admin.engineering@taco.co.id');
  const [auditorTitle, setAuditorTitle] = useState('Boiler Utility Auditor');
  const [notes, setNotes] = useState('Laporan audit terverifikasi berdasarkan log harian, pembacaan flowmeter steam, dan rekonsiliasi timbangan jembatan (weighbridge).');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExportPdf = () => {
    setIsExporting(true);
    try {
      const periodText = summaries.length > 0
        ? `${summaries[0].displayTanggal} s/d ${summaries[summaries.length - 1].displayTanggal}`
        : 'Semua Data';

      exportAuditReportPdf(summaries, entries, {
        companyName,
        department,
        auditorName,
        auditorTitle,
        periodText,
        notes,
      });
      onClose();
    } catch (e) {
      console.error('Error exporting PDF:', e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsvDetail = () => {
    exportDetailToCsv(entries, steamDataMap, `Audit_Detail_Bahan_Bakar_Boiler_${new Date().toISOString().slice(0, 10)}.csv`);
    onClose();
  };

  const handleExportCsvSummary = () => {
    exportDailySummaryToCsv(summaries, `Audit_Ringkasan_Harian_Boiler_${new Date().toISOString().slice(0, 10)}.csv`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                Ekspor Laporan Audit Bahan Bakar
              </h3>
              <p className="text-xs text-slate-400">
                Dokumen resmi untuk keperluan audit internal/eksternal utilitas boiler
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

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Audit Metadata Form */}
          <div className="space-y-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nama Perusahaan / Plant
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-slate-800 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Departemen
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Auditor / Pembuat Dokumen
                </label>
                <input
                  type="text"
                  value={auditorName}
                  onChange={(e) => setAuditorName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Catatan Verifikasi Audit
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-slate-800 resize-none text-[11px]"
              />
            </div>
          </div>

          {/* Export Action Options */}
          <div className="space-y-2 pt-1">
            <div className="font-semibold text-slate-800 flex items-center justify-between">
              <span>Pilih Format Unduhan:</span>
              <span className="text-[11px] font-normal text-slate-500">
                {entries.length} baris data · {summaries.length} hari
              </span>
            </div>

            {/* Option 1: PDF */}
            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="w-full flex items-center justify-between p-3 border border-slate-300 hover:border-amber-500 hover:bg-amber-50/30 rounded-xl transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 group-hover:text-amber-900 flex items-center gap-1.5">
                    <span>Laporan Audit Lengkap (PDF)</span>
                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-rose-100 text-rose-700">
                      Resmi
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Format landscape 2 halaman: KPI Executive, Ringkasan Harian per Bahan Bakar, Log Transaksi, & Lembar Pengesahan Tanda Tangan.
                  </div>
                </div>
              </div>
            </button>

            {/* Option 2: CSV Detail */}
            <button
              onClick={handleExportCsvDetail}
              className="w-full flex items-center justify-between p-3 border border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-xl transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <Table className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 group-hover:text-emerald-900">
                    Ekspor CSV Detail Spreadsheet
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Format kolom identik dengan Google Sheet / Excel (NO, NAMA PT, BAHAN BAKAR, MC, KONSUMSI, STEAM OUT).
                  </div>
                </div>
              </div>
            </button>

            {/* Option 3: CSV Summary */}
            <button
              onClick={handleExportCsvSummary}
              className="w-full flex items-center justify-between p-3 border border-slate-300 hover:border-sky-500 hover:bg-sky-50/30 rounded-xl transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
                  <Table className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 group-hover:text-sky-900">
                    Ekspor CSV Ringkasan Harian
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Tabel ringkasan konsumsi dan biaya per hari untuk 4 bahan bakar & efisiensi steam.
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-400">Standar Audit ISO 50001 Energy Management</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
