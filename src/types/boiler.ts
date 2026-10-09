export type FuelType = 'CANGKANG' | 'WOOD PELLET' | 'DUST PELLET' | 'KOPI PELLET';

export interface FuelEntry {
  id: string;
  no: number;
  namaPt: string;
  bahanBakar: FuelType;
  tanggal: string; // Format YYYY-MM-DD for sorting/filtering, displayed as DD/MM/YYYY
  mc: number; // Moisture Content %
  calori: number | null; // Caloric value in kcal/kg
  konsumsi: number; // kg
  harga: number; // Rp/kg
  totalHarga: number; // konsumsi * harga
}

export interface DaySteamData {
  tanggal: string;
  steamOut: number; // Ton steam produced
}

export interface DailyFuelSummary {
  tanggal: string;
  displayTanggal: string;
  totalKonsumsi: number; // Total kg across all fuels
  totalHarga: number; // Total Rp across all fuels
  steamOut: number; // Ton
  kgPerTonSteam: number; // Specific fuel consumption: total kg / steamOut
  rpPerTonSteam: number; // Steam cost: totalHarga / steamOut
  breakdown: Record<FuelType, {
    konsumsi: number; // kg
    hargaTotal: number; // Rp
    avgHarga: number; // Rp/kg
    avgMc: number; // %
    entryCount: number;
  }>;
  entries: FuelEntry[];
}

export interface DateFilter {
  startDate: string;
  endDate: string;
  selectedFuel: string; // 'ALL' | FuelType
  selectedSupplier: string; // 'ALL' | string
  searchQuery: string;
}

export interface SpreadsheetSyncConfig {
  sheetUrl: string;
  autoSync: boolean;
  intervalMinutes: number;
  lastSyncedAt: string | null;
  syncMethod: 'url' | 'paste';
  autoMergeMode: 'replace' | 'merge';
}

