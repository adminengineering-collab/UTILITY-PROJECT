import React, { useState, useEffect } from 'react';
import { FuelEntry, FuelType } from '../types/boiler';
import { FUEL_TYPES } from '../data/initialData';
import { formatNumber, formatRupiah } from '../utils/calculations';
import { X, Check, Calculator } from 'lucide-react';

interface AddRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Partial<FuelEntry>, steamOut?: number) => void;
  editingEntry?: FuelEntry | null;
  currentSteamOut?: number;
  existingSuppliers: string[];
}

export const AddRecordModal: React.FC<AddRecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingEntry,
  currentSteamOut,
  existingSuppliers,
}) => {
  const [namaPt, setNamaPt] = useState('');
  const [customPt, setCustomPt] = useState('');
  const [bahanBakar, setBahanBakar] = useState<FuelType>('WOOD PELLET');
  const [tanggal, setTanggal] = useState('2026-02-01');
  const [mc, setMc] = useState('6.50');
  const [calori, setCalori] = useState('');
  const [konsumsi, setKonsumsi] = useState('');
  const [harga, setHarga] = useState('1750');
  const [steamOut, setSteamOut] = useState('');

  useEffect(() => {
    if (editingEntry) {
      setNamaPt(editingEntry.namaPt);
      setCustomPt('');
      setBahanBakar(editingEntry.bahanBakar);
      setTanggal(editingEntry.tanggal);
      setMc(editingEntry.mc.toString());
      setCalori(editingEntry.calori !== null ? editingEntry.calori.toString() : '');
      setKonsumsi(editingEntry.konsumsi.toString());
      setHarga(editingEntry.harga.toString());
      setSteamOut(currentSteamOut ? currentSteamOut.toString() : '');
    } else {
      setNamaPt(existingSuppliers[0] || 'MARSHARI');
      setCustomPt('');
      setBahanBakar('WOOD PELLET');
      setTanggal(new Date().toISOString().slice(0, 10));
      setMc('6.50');
      setCalori('');
      setKonsumsi('');
      setHarga('1750');
      setSteamOut(currentSteamOut ? currentSteamOut.toString() : '380');
    }
  }, [editingEntry, isOpen, currentSteamOut, existingSuppliers]);

  if (!isOpen) return null;

  const numKonsumsi = parseFloat(konsumsi) || 0;
  const numHarga = parseFloat(harga) || 0;
  const calculatedTotal = numKonsumsi * numHarga;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPt = namaPt === '__CUSTOM__' ? customPt.trim() : namaPt;
    if (!finalPt) return;

    const entryData: Partial<FuelEntry> = {
      namaPt: finalPt.toUpperCase(),
      bahanBakar,
      tanggal,
      mc: parseFloat(mc) || 0,
      calori: calori.trim() ? parseFloat(calori) : null,
      konsumsi: numKonsumsi,
      harga: numHarga,
      totalHarga: calculatedTotal,
    };

    const steamVal = parseFloat(steamOut);
    onSave(entryData, !isNaN(steamVal) ? steamVal : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold tracking-tight">
              {editingEntry ? 'Edit Catatan Pemakaian Bahan Bakar' : 'Catat Pemakaian / Penerimaan Baru'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Input data operasional harian boiler utilitas
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tanggal */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Operasional
              </label>
              <input
                type="date"
                required
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Bahan Bakar */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jenis Bahan Bakar
              </label>
              <select
                value={bahanBakar}
                onChange={(e) => setBahanBakar(e.target.value as FuelType)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white font-medium"
              >
                {FUEL_TYPES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Supplier PT */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama PT / Supplier
            </label>
            <select
              value={namaPt}
              onChange={(e) => setNamaPt(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white font-medium mb-1.5"
            >
              {existingSuppliers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value="__CUSTOM__">+ Tambah Supplier Baru...</option>
            </select>

            {namaPt === '__CUSTOM__' && (
              <input
                type="text"
                required
                placeholder="Masukkan Nama PT Baru (e.g. PT BIO ENERGI NUSANTARA)"
                value={customPt}
                onChange={(e) => setCustomPt(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-amber-400 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            )}
          </div>

          {/* Moisture Content & Calori */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                MC (Moisture Content %)
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="Contoh: 6.70"
                value={mc}
                onChange={(e) => setMc(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Calori (kcal/kg) <span className="text-slate-400 font-normal">(opsional)</span>
              </label>
              <input
                type="number"
                step="1"
                placeholder="Contoh: 4250"
                value={calori}
                onChange={(e) => setCalori(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Konsumsi & Harga */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Konsumsi Bahan Bakar (kg)
              </label>
              <input
                type="number"
                step="1"
                required
                placeholder="Contoh: 15400"
                value={konsumsi}
                onChange={(e) => setKonsumsi(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Harga per kg (Rp)
              </label>
              <input
                type="number"
                step="1"
                required
                placeholder="Contoh: 1775"
                value={harga}
                onChange={(e) => setHarga(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Steam Output */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Steam Out Tanggal Ini (Ton)
            </label>
            <input
              type="number"
              step="1"
              placeholder="Contoh: 381"
              value={steamOut}
              onChange={(e) => setSteamOut(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono"
            />
          </div>

          {/* Live Auto Calculation Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-slate-600">Total Harga Otomatis:</span>
            </div>
            <div className="text-sm font-bold font-mono text-slate-900 tabular-nums">
              {formatRupiah(calculatedTotal)}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>{editingEntry ? 'Perbarui Data' : 'Simpan Transaksi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
