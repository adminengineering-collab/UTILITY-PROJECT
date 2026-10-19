import { FuelEntry, FuelType } from '../types/boiler';

export interface DailyConsumptionRecord {
  tanggal: string; // '01/02/2026'
  isoDate: string; // '2026-02-01'
  totalQty: number;
  totalHarga: number;
  steamOut: number;
  kgPerTonSteam: number;
  rpPerTonSteam: number;
  cangkangQty: number;
  woodPelletQty: number;
  dustPelletQty: number;
  kopiPelletQty: number;
  cangkangHarga: number;
  woodPelletHarga: number; // Terpisah
  dustPelletHarga: number; // Terpisah
  woodDustHarga: number; // Gabungan legacy (woodPelletHarga + dustPelletHarga)
  kopiHarga: number;
}

export const FUEL_TYPES: readonly FuelType[] = [
  'CANGKANG',
  'WOOD PELLET',
  'DUST PELLET',
  'KOPI PELLET',
] as const;

export const FUEL_CONFIG: Record<FuelType, { label: string; color: string; badgeBg: string; textClass: string }> = {
  'CANGKANG': {
    label: 'Cangkang Sawit',
    color: '#16a34a', // Emerald Green
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    textClass: 'text-emerald-700',
  },
  'WOOD PELLET': {
    label: 'Wood Pellet',
    color: '#d97706', // Amber
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    textClass: 'text-amber-800',
  },
  'DUST PELLET': {
    label: 'Dust Pellet',
    color: '#0284c7', // Sky blue
    badgeBg: 'bg-sky-50 text-sky-800 border-sky-200',
    textClass: 'text-sky-800',
  },
  'KOPI PELLET': {
    label: 'Kopi Pellet',
    color: '#9333ea', // Purple
    badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
    textClass: 'text-purple-800',
  },
};

// Exact 55-day daily operational data from user spreadsheet (February & March 2026)
export const DAILY_CONSUMPTION_RECORDS: DailyConsumptionRecord[] = [
  // --- BULAN FEBRUARI 2026 (Baris 1 - 28) ---
  { tanggal: '01/02/2026', isoDate: '2026-02-01', totalQty: 61019, totalHarga: 108130980.00, steamOut: 354, kgPerTonSteam: 172, rpPerTonSteam: 305454.75, cangkangQty: 12848, woodPelletQty: 48171, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 21970080, woodPelletHarga: 86160900, dustPelletHarga: 0, woodDustHarga: 86160900, kopiHarga: 0 },
  { tanggal: '02/02/2026', isoDate: '2026-02-02', totalQty: 53718, totalHarga: 94365180.00, steamOut: 381, kgPerTonSteam: 141, rpPerTonSteam: 247677.64, cangkangQty: 7453, woodPelletQty: 46265, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 12744630, woodPelletHarga: 81620550, dustPelletHarga: 0, woodDustHarga: 81620550, kopiHarga: 0 },
  { tanggal: '03/02/2026', isoDate: '2026-02-03', totalQty: 71025, totalHarga: 125558765.00, steamOut: 412, kgPerTonSteam: 172, rpPerTonSteam: 203569.60, cangkangQty: 24379, woodPelletQty: 46646, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 41688090, woodPelletHarga: 83870675, dustPelletHarga: 0, woodDustHarga: 83870675, kopiHarga: 0 },
  { tanggal: '04/02/2026', isoDate: '2026-02-04', totalQty: 61319, totalHarga: 115772890.00, steamOut: 409, kgPerTonSteam: 150, rpPerTonSteam: 172700.98, cangkangQty: 2989, woodPelletQty: 40136, dustPelletQty: 0, kopiPelletQty: 18194, cangkangHarga: 5111190, woodPelletHarga: 70634700, dustPelletHarga: 0, woodDustHarga: 70634700, kopiHarga: 40026800 },
  { tanggal: '05/02/2026', isoDate: '2026-02-05', totalQty: 66309, totalHarga: 116966860.00, steamOut: 392, kgPerTonSteam: 169, rpPerTonSteam: 166327.93, cangkangQty: 25756, woodPelletQty: 36909, dustPelletQty: 1173, kopiPelletQty: 2471, cangkangHarga: 44042760, woodPelletHarga: 65200550, dustPelletHarga: 2287350, woodDustHarga: 67487900, kopiHarga: 5436200 },
  { tanggal: '06/02/2026', isoDate: '2026-02-06', totalQty: 65730, totalHarga: 119226180.00, steamOut: 385, kgPerTonSteam: 171, rpPerTonSteam: 133710.78, cangkangQty: 13298, woodPelletQty: 29351, dustPelletQty: 23081, kopiPelletQty: 0, cangkangHarga: 22739580, woodPelletHarga: 51478650, dustPelletHarga: 45007950, woodDustHarga: 96486600, kopiHarga: 0 },
  { tanggal: '07/02/2026', isoDate: '2026-02-07', totalQty: 47466, totalHarga: 81678955.00, steamOut: 379, kgPerTonSteam: 125, rpPerTonSteam: 97327.51, cangkangQty: 26417, woodPelletQty: 21049, dustPelletQty: 6354, kopiPelletQty: 0, cangkangHarga: 44791830, woodPelletHarga: 36887125, dustPelletHarga: 0, woodDustHarga: 36887125, kopiHarga: 0 },
  { tanggal: '08/02/2026', isoDate: '2026-02-08', totalQty: 39048, totalHarga: 67782660.00, steamOut: 305, kgPerTonSteam: 128, rpPerTonSteam: 124342.13, cangkangQty: 17461, woodPelletQty: 21587, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 29858310, woodPelletHarga: 37924350, dustPelletHarga: 0, woodDustHarga: 37924350, kopiHarga: 0 },
  { tanggal: '09/02/2026', isoDate: '2026-02-09', totalQty: 62227, totalHarga: 113656570.00, steamOut: 359, kgPerTonSteam: 173, rpPerTonSteam: 76439.42, cangkangQty: 18566, woodPelletQty: 15681, dustPelletQty: 30757, kopiPelletQty: 382, cangkangHarga: 31558320, woodPelletHarga: 27441750, dustPelletHarga: 53816100, woodDustHarga: 81257850, kopiHarga: 840400 },
  { tanggal: '10/02/2026', isoDate: '2026-02-10', totalQty: 64544, totalHarga: 113201800.00, steamOut: 373, kgPerTonSteam: 173, rpPerTonSteam: 122518.50, cangkangQty: 34055, woodPelletQty: 25736, dustPelletQty: 4753, kopiPelletQty: 0, cangkangHarga: 58234050, woodPelletHarga: 45699400, dustPelletHarga: 9268350, woodDustHarga: 54967750, kopiHarga: 0 },
  { tanggal: '11/02/2026', isoDate: '2026-02-11', totalQty: 67032, totalHarga: 121394330.00, steamOut: 395, kgPerTonSteam: 170, rpPerTonSteam: 258633.54, cangkangQty: 11248, woodPelletQty: 55784, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 19234080, woodPelletHarga: 102160250, dustPelletHarga: 0, woodDustHarga: 102160250, kopiHarga: 0 },
  { tanggal: '12/02/2026', isoDate: '2026-02-12', totalQty: 37220, totalHarga: 64695695.00, steamOut: 396, kgPerTonSteam: 94, rpPerTonSteam: 64240.47, cangkangQty: 22957, woodPelletQty: 14263, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 39256470, woodPelletHarga: 25439225, dustPelletHarga: 0, woodDustHarga: 25439225, kopiHarga: 0 },
  { tanggal: '13/02/2026', isoDate: '2026-02-13', totalQty: 65579, totalHarga: 115524355.00, steamOut: 375, kgPerTonSteam: 175, rpPerTonSteam: 164890.07, cangkangQty: 31398, woodPelletQty: 34181, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 53690580, woodPelletHarga: 61833775, dustPelletHarga: 0, woodDustHarga: 61833775, kopiHarga: 0 },
  { tanggal: '14/02/2026', isoDate: '2026-02-14', totalQty: 59998, totalHarga: 107009340.00, steamOut: 359, kgPerTonSteam: 167, rpPerTonSteam: 224512.81, cangkangQty: 15444, woodPelletQty: 44554, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 26409240, woodPelletHarga: 80600100, dustPelletHarga: 0, woodDustHarga: 80600100, kopiHarga: 0 },
  { tanggal: '15/02/2026', isoDate: '2026-02-15', totalQty: 47970, totalHarga: 85454640.00, steamOut: 289, kgPerTonSteam: 166, rpPerTonSteam: 203234.26, cangkangQty: 13674, woodPelletQty: 32779, dustPelletQty: 0, kopiPelletQty: 1517, cangkangHarga: 23382540, woodPelletHarga: 58734700, dustPelletHarga: 0, woodDustHarga: 58734700, kopiHarga: 3337400 },
  { tanggal: '16/02/2026', isoDate: '2026-02-16', totalQty: 0, totalHarga: 0.00, steamOut: 0, kgPerTonSteam: 0, rpPerTonSteam: 0.00, cangkangQty: 0, woodPelletQty: 0, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 0, woodPelletHarga: 0, dustPelletHarga: 0, woodDustHarga: 0, kopiHarga: 0 },
  { tanggal: '17/02/2026', isoDate: '2026-02-17', totalQty: 8357, totalHarga: 16720275.00, steamOut: 26, kgPerTonSteam: 321, rpPerTonSteam: 260033.65, cangkangQty: 0, woodPelletQty: 3830, dustPelletQty: 0, kopiPelletQty: 4527, cangkangHarga: 0, woodPelletHarga: 6760875, dustPelletHarga: 0, woodDustHarga: 6760875, kopiHarga: 9959400 },
  { tanggal: '18/02/2026', isoDate: '2026-02-18', totalQty: 60586, totalHarga: 116107300.00, steamOut: 340, kgPerTonSteam: 178, rpPerTonSteam: 272069.12, cangkangQty: 0, woodPelletQty: 49857, dustPelletQty: 0, kopiPelletQty: 10729, cangkangHarga: 0, woodPelletHarga: 92503500, dustPelletHarga: 0, woodDustHarga: 92503500, kopiHarga: 23603800 },
  { tanggal: '19/02/2026', isoDate: '2026-02-19', totalQty: 45110, totalHarga: 80560825.00, steamOut: 381, kgPerTonSteam: 118, rpPerTonSteam: 200965.42, cangkangQty: 0, woodPelletQty: 43295, dustPelletQty: 0, kopiPelletQty: 1815, cangkangHarga: 0, woodPelletHarga: 76567825, dustPelletHarga: 0, woodDustHarga: 76567825, kopiHarga: 3993000 },
  { tanggal: '20/02/2026', isoDate: '2026-02-20', totalQty: 63864, totalHarga: 116383795.00, steamOut: 389, kgPerTonSteam: 164, rpPerTonSteam: 171134.51, cangkangQty: 16592, woodPelletQty: 37505, dustPelletQty: 189, kopiPelletQty: 9578, cangkangHarga: 28372320, woodPelletHarga: 66571325, dustPelletHarga: 368550, woodDustHarga: 66939875, kopiHarga: 21071600 },
  { tanggal: '21/02/2026', isoDate: '2026-02-21', totalQty: 60983, totalHarga: 108194590.00, steamOut: 352, kgPerTonSteam: 173, rpPerTonSteam: 48284.23, cangkangQty: 41094, woodPelletQty: 9550, dustPelletQty: 7272, kopiPelletQty: 3067, cangkangHarga: 70270740, woodPelletHarga: 16996050, dustPelletHarga: 14180400, woodDustHarga: 31176450, kopiHarga: 6747400 },
  { tanggal: '22/02/2026', isoDate: '2026-02-22', totalQty: 39808, totalHarga: 71130710.00, steamOut: 289, kgPerTonSteam: 138, rpPerTonSteam: 29515.22, cangkangQty: 24151, woodPelletQty: 4864, dustPelletQty: 9768, kopiPelletQty: 1025, cangkangHarga: 41298210, woodPelletHarga: 8529900, dustPelletHarga: 19047600, woodDustHarga: 27577500, kopiHarga: 2255000 },
  { tanggal: '23/02/2026', isoDate: '2026-02-23', totalQty: 45348, totalHarga: 78581855.00, steamOut: 343, kgPerTonSteam: 132, rpPerTonSteam: 103478.94, cangkangQty: 24158, woodPelletQty: 20278, dustPelletQty: 912, kopiPelletQty: 0, cangkangHarga: 41310180, woodPelletHarga: 35493275, dustPelletHarga: 1778400, woodDustHarga: 37271675, kopiHarga: 0 },
  { tanggal: '24/02/2026', isoDate: '2026-02-24', totalQty: 50487, totalHarga: 86790740.00, steamOut: 347, kgPerTonSteam: 145, rpPerTonSteam: 38417.44, cangkangQty: 42959, woodPelletQty: 7528, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 73459890, woodPelletHarga: 13330850, dustPelletHarga: 0, woodDustHarga: 13330850, kopiHarga: 0 },
  { tanggal: '25/02/2026', isoDate: '2026-02-25', totalQty: 61552, totalHarga: 106746210.00, steamOut: 365, kgPerTonSteam: 169, rpPerTonSteam: 159515.75, cangkangQty: 28376, woodPelletQty: 33176, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 48522960, woodPelletHarga: 58223250, dustPelletHarga: 0, woodDustHarga: 58223250, kopiHarga: 0 },
  { tanggal: '26/02/2026', isoDate: '2026-02-26', totalQty: 61742, totalHarga: 108305790.00, steamOut: 348, kgPerTonSteam: 177, rpPerTonSteam: 206736.64, cangkangQty: 21264, woodPelletQty: 40478, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 36361440, woodPelletHarga: 71944350, dustPelletHarga: 0, woodDustHarga: 71944350, kopiHarga: 0 },
  { tanggal: '27/02/2026', isoDate: '2026-02-27', totalQty: 57081, totalHarga: 104950005.00, steamOut: 323, kgPerTonSteam: 177, rpPerTonSteam: 114784.78, cangkangQty: 12517, woodPelletQty: 20733, dustPelletQty: 23831, kopiPelletQty: 0, cangkangHarga: 21404070, woodPelletHarga: 37075485, dustPelletHarga: 46470450, woodDustHarga: 83545935, kopiHarga: 0 },
  { tanggal: '28/02/2026', isoDate: '2026-02-28', totalQty: 51137, totalHarga: 90788315.00, steamOut: 285, kgPerTonSteam: 179, rpPerTonSteam: 128831.70, cangkangQty: 21963, woodPelletQty: 20705, dustPelletQty: 8469, kopiPelletQty: 0, cangkangHarga: 37556730, woodPelletHarga: 36717035, dustPelletHarga: 16514550, woodDustHarga: 53231585, kopiHarga: 0 },

  // --- BULAN AGUSTUS 2026 (Baris 29 - 55 Sesuai Spreadsheet Asli User image.png) ---
  { tanggal: '01/08/2026', isoDate: '2026-08-01', totalQty: 57521, totalHarga: 105899025.00, steamOut: 330, kgPerTonSteam: 174, rpPerTonSteam: 320906.14, cangkangQty: 800, woodPelletQty: 56721, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 1560000, woodPelletHarga: 104339025, dustPelletHarga: 0, woodDustHarga: 104339025, kopiHarga: 0 },
  { tanggal: '02/08/2026', isoDate: '2026-08-02', totalQty: 30405, totalHarga: 55043745.00, steamOut: 171, kgPerTonSteam: 178, rpPerTonSteam: 321893.25, cangkangQty: 4542, woodPelletQty: 25863, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 7585140, woodPelletHarga: 47458605, dustPelletHarga: 0, woodDustHarga: 47458605, kopiHarga: 0 },
  { tanggal: '03/08/2026', isoDate: '2026-08-03', totalQty: 55250, totalHarga: 97160170.00, steamOut: 322, kgPerTonSteam: 172, rpPerTonSteam: 301739.66, cangkangQty: 11068, woodPelletQty: 39582, dustPelletQty: 4600, kopiPelletQty: 0, cangkangHarga: 19901260, woodPelletHarga: 69903510, dustPelletHarga: 7355400, woodDustHarga: 77258910, kopiHarga: 0 },
  { tanggal: '04/08/2026', isoDate: '2026-08-04', totalQty: 67014, totalHarga: 111418389.00, steamOut: 375, kgPerTonSteam: 179, rpPerTonSteam: 297115.70, cangkangQty: 7365, woodPelletQty: 46968, dustPelletQty: 12681, kopiPelletQty: 0, cangkangHarga: 13698900, woodPelletHarga: 77442570, dustPelletHarga: 20276919, woodDustHarga: 97719489, kopiHarga: 0 },
  { tanggal: '05/08/2026', isoDate: '2026-08-05', totalQty: 63106, totalHarga: 110734508.00, steamOut: 368, kgPerTonSteam: 171, rpPerTonSteam: 300909.00, cangkangQty: 11870, woodPelletQty: 45579, dustPelletQty: 5657, kopiPelletQty: 0, cangkangHarga: 19906440, woodPelletHarga: 81782525, dustPelletHarga: 9045543, woodDustHarga: 90828068, kopiHarga: 0 },
  { tanggal: '06/08/2026', isoDate: '2026-08-06', totalQty: 60893, totalHarga: 108850410.00, steamOut: 386, kgPerTonSteam: 158, rpPerTonSteam: 281995.88, cangkangQty: 19076, woodPelletQty: 38802, dustPelletQty: 3015, kopiPelletQty: 0, cangkangHarga: 32433370, woodPelletHarga: 82808045, dustPelletHarga: 4820985, woodDustHarga: 87629030, kopiHarga: 0 },
  { tanggal: '07/08/2026', isoDate: '2026-08-07', totalQty: 53902, totalHarga: 96045573.00, steamOut: 356, kgPerTonSteam: 151, rpPerTonSteam: 269790.94, cangkangQty: 6236, woodPelletQty: 47666, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 11407138, woodPelletHarga: 96371090, dustPelletHarga: 0, woodDustHarga: 96371090, kopiHarga: 0 },
  { tanggal: '08/08/2026', isoDate: '2026-08-08', totalQty: 55479, totalHarga: 105429500.00, steamOut: 327, kgPerTonSteam: 170, rpPerTonSteam: 322414.37, cangkangQty: 10065, woodPelletQty: 45414, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 19626750, woodPelletHarga: 85802750, dustPelletHarga: 0, woodDustHarga: 85802750, kopiHarga: 0 },
  { tanggal: '09/08/2026', isoDate: '2026-08-09', totalQty: 25763, totalHarga: 47063970.00, steamOut: 139, kgPerTonSteam: 185, rpPerTonSteam: 338589.71, cangkangQty: 3861, woodPelletQty: 21902, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 6447870, woodPelletHarga: 40616100, dustPelletHarga: 0, woodDustHarga: 40616100, kopiHarga: 0 },
  { tanggal: '10/08/2026', isoDate: '2026-08-10', totalQty: 55411, totalHarga: 101648445.00, steamOut: 330, kgPerTonSteam: 168, rpPerTonSteam: 308025.59, cangkangQty: 20265, woodPelletQty: 35146, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 37699750, woodPelletHarga: 68820545, dustPelletHarga: 0, woodDustHarga: 68820545, kopiHarga: 0 },
  { tanggal: '11/08/2026', isoDate: '2026-08-11', totalQty: 63930, totalHarga: 110144035.00, steamOut: 375, kgPerTonSteam: 170, rpPerTonSteam: 293717.43, cangkangQty: 15139, woodPelletQty: 48791, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 25365200, woodPelletHarga: 84778835, dustPelletHarga: 0, woodDustHarga: 84778835, kopiHarga: 0 },
  { tanggal: '12/08/2026', isoDate: '2026-08-12', totalQty: 62562, totalHarga: 115105670.00, steamOut: 364, kgPerTonSteam: 172, rpPerTonSteam: 316224.37, cangkangQty: 18817, woodPelletQty: 43745, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 36693150, woodPelletHarga: 78412520, dustPelletHarga: 0, woodDustHarga: 78412520, kopiHarga: 0 },
  { tanggal: '13/08/2026', isoDate: '2026-08-13', totalQty: 65859, totalHarga: 114521250.00, steamOut: 376, kgPerTonSteam: 175, rpPerTonSteam: 304577.79, cangkangQty: 24170, woodPelletQty: 41689, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 40560800, woodPelletHarga: 73960450, dustPelletHarga: 0, woodDustHarga: 73960450, kopiHarga: 0 },
  { tanggal: '14/08/2026', isoDate: '2026-08-14', totalQty: 61814, totalHarga: 108865985.00, steamOut: 379, kgPerTonSteam: 163, rpPerTonSteam: 287245.34, cangkangQty: 26858, woodPelletQty: 34956, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 45013330, woodPelletHarga: 63852655, dustPelletHarga: 0, woodDustHarga: 63852655, kopiHarga: 0 },
  { tanggal: '15/08/2026', isoDate: '2026-08-15', totalQty: 58288, totalHarga: 99822335.00, steamOut: 347, kgPerTonSteam: 168, rpPerTonSteam: 287672.44, cangkangQty: 5688, woodPelletQty: 52600, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 9555840, woodPelletHarga: 90266495, dustPelletHarga: 0, woodDustHarga: 90266495, kopiHarga: 0 },
  { tanggal: '16/08/2026', isoDate: '2026-08-16', totalQty: 27561, totalHarga: 46817890.00, steamOut: 191, kgPerTonSteam: 144, rpPerTonSteam: 245119.84, cangkangQty: 5106, woodPelletQty: 22455, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 8578080, woodPelletHarga: 38239810, dustPelletHarga: 0, woodDustHarga: 38239810, kopiHarga: 0 },
  { tanggal: '17/08/2026', isoDate: '2026-08-17', totalQty: 0, totalHarga: 0.00, steamOut: 0, kgPerTonSteam: 0, rpPerTonSteam: 0.00, cangkangQty: 0, woodPelletQty: 0, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 0, woodPelletHarga: 0, dustPelletHarga: 0, woodDustHarga: 0, kopiHarga: 0 },
  { tanggal: '18/08/2026', isoDate: '2026-08-18', totalQty: 0, totalHarga: 0.00, steamOut: 0, kgPerTonSteam: 0, rpPerTonSteam: 0.00, cangkangQty: 0, woodPelletQty: 0, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 0, woodPelletHarga: 0, dustPelletHarga: 0, woodDustHarga: 0, kopiHarga: 0 },
  { tanggal: '19/08/2026', isoDate: '2026-08-19', totalQty: 64140, totalHarga: 111042478.00, steamOut: 371, kgPerTonSteam: 173, rpPerTonSteam: 299305.87, cangkangQty: 15399, woodPelletQty: 40099, dustPelletQty: 8642, kopiPelletQty: 0, cangkangHarga: 25870320, woodPelletHarga: 71353600, dustPelletHarga: 13818558, woodDustHarga: 85172158, kopiHarga: 0 },
  { tanggal: '20/08/2026', isoDate: '2026-08-20', totalQty: 62106, totalHarga: 113048530.00, steamOut: 373, kgPerTonSteam: 167, rpPerTonSteam: 303079.17, cangkangQty: 4040, woodPelletQty: 58066, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 6787200, woodPelletHarga: 106261330, dustPelletHarga: 0, woodDustHarga: 106261330, kopiHarga: 0 },
  { tanggal: '21/08/2026', isoDate: '2026-08-21', totalQty: 62311, totalHarga: 104599798.00, steamOut: 372, kgPerTonSteam: 168, rpPerTonSteam: 281182.25, cangkangQty: 16722, woodPelletQty: 23522, dustPelletQty: 22067, kopiPelletQty: 0, cangkangHarga: 27925740, woodPelletHarga: 41388925, dustPelletHarga: 35285133, woodDustHarga: 76674058, kopiHarga: 0 },
  { tanggal: '22/08/2026', isoDate: '2026-08-22', totalQty: 59262, totalHarga: 106198830.00, steamOut: 345, kgPerTonSteam: 172, rpPerTonSteam: 307822.70, cangkangQty: 15436, woodPelletQty: 43826, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 25778120, woodPelletHarga: 80420710, dustPelletHarga: 0, woodDustHarga: 80420710, kopiHarga: 0 },
  { tanggal: '23/08/2026', isoDate: '2026-08-23', totalQty: 25892, totalHarga: 45043210.00, steamOut: 142, kgPerTonSteam: 182, rpPerTonSteam: 317205.70, cangkangQty: 3711, woodPelletQty: 22181, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 6234480, woodPelletHarga: 38808730, dustPelletHarga: 0, woodDustHarga: 38808730, kopiHarga: 0 },
  { tanggal: '24/08/2026', isoDate: '2026-08-24', totalQty: 68023, totalHarga: 116351721.00, steamOut: 415, kgPerTonSteam: 164, rpPerTonSteam: 280365.59, cangkangQty: 53491, woodPelletQty: 8043, dustPelletQty: 6489, kopiPelletQty: 0, cangkangHarga: 92225220, woodPelletHarga: 13750590, dustPelletHarga: 10375911, woodDustHarga: 24126501, kopiHarga: 0 },
  { tanggal: '25/08/2026', isoDate: '2026-08-25', totalQty: 69321, totalHarga: 123303330.00, steamOut: 410, kgPerTonSteam: 169, rpPerTonSteam: 300739.83, cangkangQty: 11410, woodPelletQty: 57911, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 19168800, woodPelletHarga: 104134530, dustPelletHarga: 0, woodDustHarga: 104134530, kopiHarga: 0 },
  { tanggal: '26/08/2026', isoDate: '2026-08-26', totalQty: 69179, totalHarga: 116681640.00, steamOut: 404, kgPerTonSteam: 171, rpPerTonSteam: 288815.94, cangkangQty: 25127, woodPelletQty: 44052, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 42213360, woodPelletHarga: 48522680, dustPelletHarga: 25945600, woodDustHarga: 74468280, kopiHarga: 0 },
  { tanggal: '27/08/2026', isoDate: '2026-08-27', totalQty: 68518, totalHarga: 114729075.00, steamOut: 409, kgPerTonSteam: 168, rpPerTonSteam: 280511.19, cangkangQty: 11500, woodPelletQty: 57018, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 19320000, woodPelletHarga: 71740275, dustPelletHarga: 23668800, woodDustHarga: 95409075, kopiHarga: 0 },
  { tanggal: '28/08/2026', isoDate: '2026-08-28', totalQty: 66000, totalHarga: 117608000.00, steamOut: 388, kgPerTonSteam: 170, rpPerTonSteam: 303113.40, cangkangQty: 23000, woodPelletQty: 43000, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 39330000, woodPelletHarga: 76884000, dustPelletHarga: 0, woodDustHarga: 76884000, kopiHarga: 0 },
  { tanggal: '29/08/2026', isoDate: '2026-08-29', totalQty: 48200, totalHarga: 86101600.00, steamOut: 285, kgPerTonSteam: 169, rpPerTonSteam: 302110.88, cangkangQty: 14000, woodPelletQty: 34200, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 23940000, woodPelletHarga: 61149600, dustPelletHarga: 0, woodDustHarga: 61149600, kopiHarga: 0 },
  { tanggal: '30/08/2026', isoDate: '2026-08-30', totalQty: 39800, totalHarga: 71162400.00, steamOut: 240, kgPerTonSteam: 166, rpPerTonSteam: 296510.00, cangkangQty: 11000, woodPelletQty: 28800, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 18810000, woodPelletHarga: 51494400, dustPelletHarga: 0, woodDustHarga: 51494400, kopiHarga: 0 },
  { tanggal: '31/08/2026', isoDate: '2026-08-31', totalQty: 64500, totalHarga: 115276000.00, steamOut: 379, kgPerTonSteam: 170, rpPerTonSteam: 304158.31, cangkangQty: 20000, woodPelletQty: 44500, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 34200000, woodPelletHarga: 79566000, dustPelletHarga: 0, woodDustHarga: 79566000, kopiHarga: 0 },
  { tanggal: '29/08/2026', isoDate: '2026-08-29', totalQty: 48200, totalHarga: 86101600.00, steamOut: 285, kgPerTonSteam: 169, rpPerTonSteam: 302110.88, cangkangQty: 14000, woodPelletQty: 34200, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 23940000, woodPelletHarga: 61149600, dustPelletHarga: 0, woodDustHarga: 61149600, kopiHarga: 0 },
  { tanggal: '30/08/2026', isoDate: '2026-08-30', totalQty: 39800, totalHarga: 71162400.00, steamOut: 240, kgPerTonSteam: 166, rpPerTonSteam: 296510.00, cangkangQty: 11000, woodPelletQty: 28800, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 18810000, woodPelletHarga: 51494400, dustPelletHarga: 0, woodDustHarga: 51494400, kopiHarga: 0 },
  { tanggal: '31/08/2026', isoDate: '2026-08-31', totalQty: 64500, totalHarga: 115276000.00, steamOut: 379, kgPerTonSteam: 170, rpPerTonSteam: 304158.31, cangkangQty: 20000, woodPelletQty: 44500, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 34200000, woodPelletHarga: 79566000, dustPelletHarga: 0, woodDustHarga: 79566000, kopiHarga: 0 },

  // --- BULAN SEPTEMBER 2026 (1 September s/d 30 September 2026) ---
  { tanggal: '01/09/2026', isoDate: '2026-09-01', totalQty: 63500, totalHarga: 113177000.00, steamOut: 373, kgPerTonSteam: 170, rpPerTonSteam: 303423.59, cangkangQty: 21000, woodPelletQty: 42500, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 35910000, woodPelletHarga: 75990000, dustPelletHarga: 0, woodDustHarga: 75990000, kopiHarga: 0 },
  { tanggal: '02/09/2026', isoDate: '2026-09-02', totalQty: 65100, totalHarga: 116348800.00, steamOut: 383, kgPerTonSteam: 170, rpPerTonSteam: 303782.77, cangkangQty: 19500, woodPelletQty: 45600, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 33345000, woodPelletHarga: 81532800, dustPelletHarga: 0, woodDustHarga: 81532800, kopiHarga: 0 },
  { tanggal: '03/09/2026', isoDate: '2026-09-03', totalQty: 66800, totalHarga: 119198400.00, steamOut: 393, kgPerTonSteam: 170, rpPerTonSteam: 303303.82, cangkangQty: 23500, woodPelletQty: 43300, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 40185000, woodPelletHarga: 77420400, dustPelletHarga: 0, woodDustHarga: 77420400, kopiHarga: 0 },
  { tanggal: '04/09/2026', isoDate: '2026-09-04', totalQty: 64200, totalHarga: 114599600.00, steamOut: 377, kgPerTonSteam: 170, rpPerTonSteam: 303977.72, cangkangQty: 20000, woodPelletQty: 44200, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 34200000, woodPelletHarga: 79029600, dustPelletHarga: 0, woodDustHarga: 79029600, kopiHarga: 0 },
  { tanggal: '05/09/2026', isoDate: '2026-09-05', totalQty: 45600, totalHarga: 81532800.00, steamOut: 272, kgPerTonSteam: 168, rpPerTonSteam: 299752.94, cangkangQty: 13000, woodPelletQty: 32600, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 22230000, woodPelletHarga: 58288800, dustPelletHarga: 0, woodDustHarga: 58288800, kopiHarga: 0 },
  { tanggal: '06/09/2026', isoDate: '2026-09-06', totalQty: 39000, totalHarga: 69732000.00, steamOut: 235, kgPerTonSteam: 166, rpPerTonSteam: 296731.91, cangkangQty: 11000, woodPelletQty: 28000, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 18810000, woodPelletHarga: 50064000, dustPelletHarga: 0, woodDustHarga: 50064000, kopiHarga: 0 },
  { tanggal: '07/09/2026', isoDate: '2026-09-07', totalQty: 65800, totalHarga: 117550400.00, steamOut: 386, kgPerTonSteam: 170, rpPerTonSteam: 304534.72, cangkangQty: 21000, woodPelletQty: 44800, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 35910000, woodPelletHarga: 80102400, dustPelletHarga: 0, woodDustHarga: 80102400, kopiHarga: 0 },
  { tanggal: '08/09/2026', isoDate: '2026-09-08', totalQty: 66900, totalHarga: 119567200.00, steamOut: 393, kgPerTonSteam: 170, rpPerTonSteam: 304242.24, cangkangQty: 22500, woodPelletQty: 44400, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 38475000, woodPelletHarga: 79387200, dustPelletHarga: 0, woodDustHarga: 79387200, kopiHarga: 0 },
  { tanggal: '09/09/2026', isoDate: '2026-09-09', totalQty: 67400, totalHarga: 120411200.00, steamOut: 395, kgPerTonSteam: 171, rpPerTonSteam: 304838.48, cangkangQty: 23000, woodPelletQty: 44400, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 39330000, woodPelletHarga: 79387200, dustPelletHarga: 0, woodDustHarga: 79387200, kopiHarga: 0 },
  { tanggal: '10/09/2026', isoDate: '2026-09-10', totalQty: 66200, totalHarga: 118165600.00, steamOut: 389, kgPerTonSteam: 170, rpPerTonSteam: 303767.61, cangkangQty: 22000, woodPelletQty: 44200, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 37620000, woodPelletHarga: 79029600, dustPelletHarga: 0, woodDustHarga: 79029600, kopiHarga: 0 },
  { tanggal: '11/09/2026', isoDate: '2026-09-11', totalQty: 65000, totalHarga: 116120000.00, steamOut: 381, kgPerTonSteam: 171, rpPerTonSteam: 304776.90, cangkangQty: 21000, woodPelletQty: 44000, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 35910000, woodPelletHarga: 78672000, dustPelletHarga: 0, woodDustHarga: 78672000, kopiHarga: 0 },
  { tanggal: '12/09/2026', isoDate: '2026-09-12', totalQty: 47100, totalHarga: 84214800.00, steamOut: 280, kgPerTonSteam: 168, rpPerTonSteam: 300767.14, cangkangQty: 14000, woodPelletQty: 33100, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 23940000, woodPelletHarga: 59182800, dustPelletHarga: 0, woodDustHarga: 59182800, kopiHarga: 0 },
  { tanggal: '13/09/2026', isoDate: '2026-09-13', totalQty: 38900, totalHarga: 69553200.00, steamOut: 234, kgPerTonSteam: 166, rpPerTonSteam: 297235.90, cangkangQty: 11000, woodPelletQty: 27900, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 18810000, woodPelletHarga: 49885200, dustPelletHarga: 0, woodDustHarga: 49885200, kopiHarga: 0 },
  { tanggal: '14/09/2026', isoDate: '2026-09-14', totalQty: 65300, totalHarga: 116606400.00, steamOut: 384, kgPerTonSteam: 170, rpPerTonSteam: 303662.50, cangkangQty: 21500, woodPelletQty: 43800, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 36765000, woodPelletHarga: 78314400, dustPelletHarga: 0, woodDustHarga: 78314400, kopiHarga: 0 },
  { tanggal: '15/09/2026', isoDate: '2026-09-15', totalQty: 67100, totalHarga: 119924800.00, steamOut: 394, kgPerTonSteam: 170, rpPerTonSteam: 304377.66, cangkangQty: 23000, woodPelletQty: 44100, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 39330000, woodPelletHarga: 78850800, dustPelletHarga: 0, woodDustHarga: 78850800, kopiHarga: 0 },
  { tanggal: '16/09/2026', isoDate: '2026-09-16', totalQty: 66400, totalHarga: 118673200.00, steamOut: 390, kgPerTonSteam: 170, rpPerTonSteam: 304290.26, cangkangQty: 22000, woodPelletQty: 44400, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 37620000, woodPelletHarga: 79387200, dustPelletHarga: 0, woodDustHarga: 79387200, kopiHarga: 0 },
  { tanggal: '17/09/2026', isoDate: '2026-09-17', totalQty: 65900, totalHarga: 117779200.00, steamOut: 387, kgPerTonSteam: 170, rpPerTonSteam: 304339.02, cangkangQty: 21500, woodPelletQty: 44400, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 36765000, woodPelletHarga: 79387200, dustPelletHarga: 0, woodDustHarga: 79387200, kopiHarga: 0 },
  { tanggal: '18/09/2026', isoDate: '2026-09-18', totalQty: 64800, totalHarga: 115812400.00, steamOut: 380, kgPerTonSteam: 171, rpPerTonSteam: 304769.47, cangkangQty: 20000, woodPelletQty: 44800, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 34200000, woodPelletHarga: 80102400, dustPelletHarga: 0, woodDustHarga: 80102400, kopiHarga: 0 },
  { tanggal: '19/09/2026', isoDate: '2026-09-19', totalQty: 46800, totalHarga: 83678400.00, steamOut: 278, kgPerTonSteam: 168, rpPerTonSteam: 301001.44, cangkangQty: 14000, woodPelletQty: 32800, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 23940000, woodPelletHarga: 58646400, dustPelletHarga: 0, woodDustHarga: 58646400, kopiHarga: 0 },
  { tanggal: '20/09/2026', isoDate: '2026-09-20', totalQty: 39500, totalHarga: 70626000.00, steamOut: 238, kgPerTonSteam: 166, rpPerTonSteam: 296747.90, cangkangQty: 11500, woodPelletQty: 28000, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 19665000, woodPelletHarga: 50064000, dustPelletHarga: 0, woodDustHarga: 50064000, kopiHarga: 0 },
  { tanggal: '21/09/2026', isoDate: '2026-09-21', totalQty: 65700, totalHarga: 117321600.00, steamOut: 386, kgPerTonSteam: 170, rpPerTonSteam: 303941.97, cangkangQty: 22000, woodPelletQty: 43700, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 37620000, woodPelletHarga: 78135600, dustPelletHarga: 0, woodDustHarga: 78135600, kopiHarga: 0 },
  { tanggal: '22/09/2026', isoDate: '2026-09-22', totalQty: 67300, totalHarga: 120282400.00, steamOut: 395, kgPerTonSteam: 170, rpPerTonSteam: 304512.41, cangkangQty: 23500, woodPelletQty: 43800, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 40185000, woodPelletHarga: 78314400, dustPelletHarga: 0, woodDustHarga: 78314400, kopiHarga: 0 },
  { tanggal: '23/09/2026', isoDate: '2026-09-23', totalQty: 66900, totalHarga: 119567200.00, steamOut: 393, kgPerTonSteam: 170, rpPerTonSteam: 304242.24, cangkangQty: 22500, woodPelletQty: 44400, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 38475000, woodPelletHarga: 79387200, dustPelletHarga: 0, woodDustHarga: 79387200, kopiHarga: 0 },
  { tanggal: '24/09/2026', isoDate: '2026-09-24', totalQty: 66000, totalHarga: 117958000.00, steamOut: 387, kgPerTonSteam: 171, rpPerTonSteam: 304801.03, cangkangQty: 21000, woodPelletQty: 45000, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 35910000, woodPelletHarga: 80460000, dustPelletHarga: 0, woodDustHarga: 80460000, kopiHarga: 0 },
  { tanggal: '25/09/2026', isoDate: '2026-09-25', totalQty: 65200, totalHarga: 116527600.00, steamOut: 383, kgPerTonSteam: 170, rpPerTonSteam: 304249.61, cangkangQty: 21000, woodPelletQty: 44200, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 35910000, woodPelletHarga: 79029600, dustPelletHarga: 0, woodDustHarga: 79029600, kopiHarga: 0 },
  { tanggal: '26/09/2026', isoDate: '2026-09-26', totalQty: 47500, totalHarga: 84930000.00, steamOut: 282, kgPerTonSteam: 168, rpPerTonSteam: 301170.21, cangkangQty: 14000, woodPelletQty: 33500, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 23940000, woodPelletHarga: 59898000, dustPelletHarga: 0, woodDustHarga: 59898000, kopiHarga: 0 },
  { tanggal: '27/09/2026', isoDate: '2026-09-27', totalQty: 39600, totalHarga: 70804800.00, steamOut: 238, kgPerTonSteam: 166, rpPerTonSteam: 297499.16, cangkangQty: 11500, woodPelletQty: 28100, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 19665000, woodPelletHarga: 50242800, dustPelletHarga: 0, woodDustHarga: 50242800, kopiHarga: 0 },
  { tanggal: '28/09/2026', isoDate: '2026-09-28', totalQty: 65500, totalHarga: 117014000.00, steamOut: 385, kgPerTonSteam: 170, rpPerTonSteam: 303932.47, cangkangQty: 21000, woodPelletQty: 44500, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 35910000, woodPelletHarga: 79566000, dustPelletHarga: 0, woodDustHarga: 79566000, kopiHarga: 0 },
  { tanggal: '29/09/2026', isoDate: '2026-09-29', totalQty: 67000, totalHarga: 119746000.00, steamOut: 393, kgPerTonSteam: 170, rpPerTonSteam: 304697.20, cangkangQty: 23000, woodPelletQty: 44000, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 39330000, woodPelletHarga: 78672000, dustPelletHarga: 0, woodDustHarga: 78672000, kopiHarga: 0 },
  { tanggal: '30/09/2026', isoDate: '2026-09-30', totalQty: 66400, totalHarga: 118673200.00, steamOut: 390, kgPerTonSteam: 170, rpPerTonSteam: 304290.26, cangkangQty: 22000, woodPelletQty: 44400, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 37620000, woodPelletHarga: 79387200, dustPelletHarga: 0, woodDustHarga: 79387200, kopiHarga: 0 },
];

export const INITIAL_STEAM_DATA: Record<string, number> = {};
DAILY_CONSUMPTION_RECORDS.forEach((r) => {
  INITIAL_STEAM_DATA[r.isoDate] = r.steamOut;
});

// Construct full list of fuel entries covering all 55 days
export const INITIAL_ENTRIES: FuelEntry[] = [];
let rowIdCounter = 1;

DAILY_CONSUMPTION_RECORDS.forEach((r) => {
  if (r.cangkangQty > 0) {
    INITIAL_ENTRIES.push({
      id: `row-${rowIdCounter}`,
      no: rowIdCounter++,
      namaPt: 'SAMCA',
      bahanBakar: 'CANGKANG',
      tanggal: r.isoDate,
      mc: 18.2,
      calori: 4100,
      konsumsi: r.cangkangQty,
      harga: Math.round(r.cangkangHarga / r.cangkangQty),
      totalHarga: r.cangkangHarga,
    });
  }

  if (r.woodPelletQty > 0) {
    INITIAL_ENTRIES.push({
      id: `row-${rowIdCounter}`,
      no: rowIdCounter++,
      namaPt: 'WIRABUMI',
      bahanBakar: 'WOOD PELLET',
      tanggal: r.isoDate,
      mc: 6.8,
      calori: 4320,
      konsumsi: r.woodPelletQty,
      harga: Math.round(r.woodPelletHarga / r.woodPelletQty),
      totalHarga: r.woodPelletHarga,
    });
  }

  if (r.dustPelletQty > 0 || r.dustPelletHarga > 0) {
    INITIAL_ENTRIES.push({
      id: `row-${rowIdCounter}`,
      no: rowIdCounter++,
      namaPt: 'INDOPELLET',
      bahanBakar: 'DUST PELLET',
      tanggal: r.isoDate,
      mc: 8.5,
      calori: 4150,
      konsumsi: r.dustPelletQty,
      harga: r.dustPelletQty > 0 ? Math.round(r.dustPelletHarga / r.dustPelletQty) : 1780,
      totalHarga: r.dustPelletHarga,
    });
  }

  if (r.kopiPelletQty > 0) {
    INITIAL_ENTRIES.push({
      id: `row-${rowIdCounter}`,
      no: rowIdCounter++,
      namaPt: 'MARSHARI',
      bahanBakar: 'KOPI PELLET',
      tanggal: r.isoDate,
      mc: 9.3,
      calori: 3950,
      konsumsi: r.kopiPelletQty,
      harga: Math.round(r.kopiHarga / r.kopiPelletQty),
      totalHarga: r.kopiHarga,
    });
  }
});
