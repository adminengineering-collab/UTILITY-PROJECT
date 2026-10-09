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
  woodDustHarga: number;
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

// Exact 28-day daily operational data from user spreadsheet
export const DAILY_CONSUMPTION_RECORDS: DailyConsumptionRecord[] = [
  { tanggal: '01/02/2026', isoDate: '2026-02-01', totalQty: 61019, totalHarga: 108130980.00, steamOut: 354, kgPerTonSteam: 172, rpPerTonSteam: 305454.75, cangkangQty: 12848, woodPelletQty: 48171, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 21970080, woodDustHarga: 86160900, kopiHarga: 0 },
  { tanggal: '02/02/2026', isoDate: '2026-02-02', totalQty: 53718, totalHarga: 94365180.00, steamOut: 381, kgPerTonSteam: 141, rpPerTonSteam: 247677.64, cangkangQty: 7453, woodPelletQty: 46265, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 12744630, woodDustHarga: 81620550, kopiHarga: 0 },
  { tanggal: '03/02/2026', isoDate: '2026-02-03', totalQty: 71025, totalHarga: 83870675.00, steamOut: 412, kgPerTonSteam: 172, rpPerTonSteam: 203569.60, cangkangQty: 24379, woodPelletQty: 46646, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 41688090, woodDustHarga: 83870675, kopiHarga: 0 },
  { tanggal: '04/02/2026', isoDate: '2026-02-04', totalQty: 61319, totalHarga: 70634700.00, steamOut: 409, kgPerTonSteam: 150, rpPerTonSteam: 172700.98, cangkangQty: 2989, woodPelletQty: 40136, dustPelletQty: 0, kopiPelletQty: 18194, cangkangHarga: 5111190, woodDustHarga: 70634700, kopiHarga: 40026800 },
  { tanggal: '05/02/2026', isoDate: '2026-02-05', totalQty: 66309, totalHarga: 65200550.00, steamOut: 392, kgPerTonSteam: 169, rpPerTonSteam: 166327.93, cangkangQty: 25756, woodPelletQty: 36909, dustPelletQty: 1173, kopiPelletQty: 2471, cangkangHarga: 44042760, woodDustHarga: 67487900, kopiHarga: 5436200 },
  { tanggal: '06/02/2026', isoDate: '2026-02-06', totalQty: 65730, totalHarga: 51478650.00, steamOut: 385, kgPerTonSteam: 171, rpPerTonSteam: 133710.78, cangkangQty: 13298, woodPelletQty: 29351, dustPelletQty: 23081, kopiPelletQty: 0, cangkangHarga: 22739580, woodDustHarga: 96486600, kopiHarga: 0 },
  { tanggal: '07/02/2026', isoDate: '2026-02-07', totalQty: 47466, totalHarga: 36887125.00, steamOut: 379, kgPerTonSteam: 125, rpPerTonSteam: 97327.51, cangkangQty: 26417, woodPelletQty: 21049, dustPelletQty: 6354, kopiPelletQty: 0, cangkangHarga: 44791830, woodDustHarga: 36887125, kopiHarga: 0 },
  { tanggal: '08/02/2026', isoDate: '2026-02-08', totalQty: 39048, totalHarga: 37924350.00, steamOut: 305, kgPerTonSteam: 128, rpPerTonSteam: 124342.13, cangkangQty: 17461, woodPelletQty: 21587, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 29858310, woodDustHarga: 37924350, kopiHarga: 0 },
  { tanggal: '09/02/2026', isoDate: '2026-02-09', totalQty: 62227, totalHarga: 27441750.00, steamOut: 359, kgPerTonSteam: 173, rpPerTonSteam: 76439.42, cangkangQty: 18566, woodPelletQty: 15681, dustPelletQty: 30757, kopiPelletQty: 382, cangkangHarga: 31558320, woodDustHarga: 81257850, kopiHarga: 840400 },
  { tanggal: '10/02/2026', isoDate: '2026-02-10', totalQty: 64544, totalHarga: 45699400.00, steamOut: 373, kgPerTonSteam: 173, rpPerTonSteam: 122518.50, cangkangQty: 34055, woodPelletQty: 25736, dustPelletQty: 4753, kopiPelletQty: 0, cangkangHarga: 58234050, woodDustHarga: 54967750, kopiHarga: 0 },
  { tanggal: '11/02/2026', isoDate: '2026-02-11', totalQty: 67032, totalHarga: 102160250.00, steamOut: 395, kgPerTonSteam: 170, rpPerTonSteam: 258633.54, cangkangQty: 11248, woodPelletQty: 55784, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 19234080, woodDustHarga: 102160250, kopiHarga: 0 },
  { tanggal: '12/02/2026', isoDate: '2026-02-12', totalQty: 37220, totalHarga: 25439225.00, steamOut: 396, kgPerTonSteam: 94, rpPerTonSteam: 64240.47, cangkangQty: 22957, woodPelletQty: 14263, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 39256470, woodDustHarga: 25439225, kopiHarga: 0 },
  { tanggal: '13/02/2026', isoDate: '2026-02-13', totalQty: 65579, totalHarga: 61833775.00, steamOut: 375, kgPerTonSteam: 175, rpPerTonSteam: 164890.07, cangkangQty: 31398, woodPelletQty: 34181, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 53690580, woodDustHarga: 61833775, kopiHarga: 0 },
  { tanggal: '14/02/2026', isoDate: '2026-02-14', totalQty: 59998, totalHarga: 80600100.00, steamOut: 359, kgPerTonSteam: 167, rpPerTonSteam: 224512.81, cangkangQty: 15444, woodPelletQty: 44554, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 26409240, woodDustHarga: 80600100, kopiHarga: 0 },
  { tanggal: '15/02/2026', isoDate: '2026-02-15', totalQty: 47970, totalHarga: 58734700.00, steamOut: 289, kgPerTonSteam: 166, rpPerTonSteam: 203234.26, cangkangQty: 13674, woodPelletQty: 32779, dustPelletQty: 0, kopiPelletQty: 1517, cangkangHarga: 23382540, woodDustHarga: 58734700, kopiHarga: 3337400 },
  { tanggal: '16/02/2026', isoDate: '2026-02-16', totalQty: 0, totalHarga: 0.00, steamOut: 0, kgPerTonSteam: 0, rpPerTonSteam: 0.00, cangkangQty: 0, woodPelletQty: 0, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 0, woodDustHarga: 0, kopiHarga: 0 },
  { tanggal: '17/02/2026', isoDate: '2026-02-17', totalQty: 8357, totalHarga: 6760875.00, steamOut: 26, kgPerTonSteam: 321, rpPerTonSteam: 260033.65, cangkangQty: 0, woodPelletQty: 3830, dustPelletQty: 0, kopiPelletQty: 4527, cangkangHarga: 0, woodDustHarga: 6760875, kopiHarga: 9959400 },
  { tanggal: '18/02/2026', isoDate: '2026-02-18', totalQty: 60586, totalHarga: 92503500.00, steamOut: 340, kgPerTonSteam: 178, rpPerTonSteam: 272069.12, cangkangQty: 0, woodPelletQty: 49857, dustPelletQty: 0, kopiPelletQty: 10729, cangkangHarga: 0, woodDustHarga: 92503500, kopiHarga: 23603800 },
  { tanggal: '19/02/2026', isoDate: '2026-02-19', totalQty: 45110, totalHarga: 76567825.00, steamOut: 381, kgPerTonSteam: 118, rpPerTonSteam: 200965.42, cangkangQty: 0, woodPelletQty: 43295, dustPelletQty: 0, kopiPelletQty: 1815, cangkangHarga: 0, woodDustHarga: 76567825, kopiHarga: 3993000 },
  { tanggal: '20/02/2026', isoDate: '2026-02-20', totalQty: 63864, totalHarga: 66571325.00, steamOut: 389, kgPerTonSteam: 164, rpPerTonSteam: 171134.51, cangkangQty: 16592, woodPelletQty: 37505, dustPelletQty: 189, kopiPelletQty: 9578, cangkangHarga: 28372320, woodDustHarga: 66939875, kopiHarga: 21071600 },
  { tanggal: '21/02/2026', isoDate: '2026-02-21', totalQty: 60983, totalHarga: 16996050.00, steamOut: 352, kgPerTonSteam: 173, rpPerTonSteam: 48284.23, cangkangQty: 41094, woodPelletQty: 9550, dustPelletQty: 7272, kopiPelletQty: 3067, cangkangHarga: 70270740, woodDustHarga: 31176450, kopiHarga: 6747400 },
  { tanggal: '22/02/2026', isoDate: '2026-02-22', totalQty: 39808, totalHarga: 8529900.00, steamOut: 289, kgPerTonSteam: 138, rpPerTonSteam: 29515.22, cangkangQty: 24151, woodPelletQty: 4864, dustPelletQty: 9768, kopiPelletQty: 1025, cangkangHarga: 41298210, woodDustHarga: 27577500, kopiHarga: 2255000 },
  { tanggal: '23/02/2026', isoDate: '2026-02-23', totalQty: 45348, totalHarga: 35493275.00, steamOut: 343, kgPerTonSteam: 132, rpPerTonSteam: 103478.94, cangkangQty: 24158, woodPelletQty: 20278, dustPelletQty: 912, kopiPelletQty: 0, cangkangHarga: 41310180, woodDustHarga: 37271675, kopiHarga: 0 },
  { tanggal: '24/02/2026', isoDate: '2026-02-24', totalQty: 50487, totalHarga: 13330850.00, steamOut: 347, kgPerTonSteam: 145, rpPerTonSteam: 38417.44, cangkangQty: 42959, woodPelletQty: 7528, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 73459890, woodDustHarga: 13330850, kopiHarga: 0 },
  { tanggal: '25/02/2026', isoDate: '2026-02-25', totalQty: 61552, totalHarga: 58223250.00, steamOut: 365, kgPerTonSteam: 169, rpPerTonSteam: 159515.75, cangkangQty: 28376, woodPelletQty: 33176, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 48522960, woodDustHarga: 58223250, kopiHarga: 0 },
  { tanggal: '26/02/2026', isoDate: '2026-02-26', totalQty: 61742, totalHarga: 71944350.00, steamOut: 348, kgPerTonSteam: 177, rpPerTonSteam: 206736.64, cangkangQty: 21264, woodPelletQty: 40478, dustPelletQty: 0, kopiPelletQty: 0, cangkangHarga: 36361440, woodDustHarga: 71944350, kopiHarga: 0 },
  { tanggal: '27/02/2026', isoDate: '2026-02-27', totalQty: 57081, totalHarga: 37075485.00, steamOut: 323, kgPerTonSteam: 177, rpPerTonSteam: 114784.78, cangkangQty: 12517, woodPelletQty: 20733, dustPelletQty: 23831, kopiPelletQty: 0, cangkangHarga: 21404070, woodDustHarga: 83545935, kopiHarga: 0 },
  { tanggal: '28/02/2026', isoDate: '2026-02-28', totalQty: 51137, totalHarga: 36717035.00, steamOut: 285, kgPerTonSteam: 179, rpPerTonSteam: 128831.70, cangkangQty: 21963, woodPelletQty: 20705, dustPelletQty: 8469, kopiPelletQty: 0, cangkangHarga: 37556730, woodDustHarga: 53231585, kopiHarga: 0 },
];

export const INITIAL_STEAM_DATA: Record<string, number> = {};
DAILY_CONSUMPTION_RECORDS.forEach((r) => {
  INITIAL_STEAM_DATA[r.isoDate] = r.steamOut;
});

// Construct full list of fuel entries
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
    const woodShare = r.dustPelletQty > 0
      ? Math.round(r.woodDustHarga * (r.woodPelletQty / (r.woodPelletQty + r.dustPelletQty)))
      : r.woodDustHarga;
    INITIAL_ENTRIES.push({
      id: `row-${rowIdCounter}`,
      no: rowIdCounter++,
      namaPt: 'WIRABUMI',
      bahanBakar: 'WOOD PELLET',
      tanggal: r.isoDate,
      mc: 6.8,
      calori: 4320,
      konsumsi: r.woodPelletQty,
      harga: Math.round(woodShare / r.woodPelletQty),
      totalHarga: woodShare,
    });
  }

  if (r.dustPelletQty > 0) {
    const woodShare = Math.round(r.woodDustHarga * (r.woodPelletQty / (r.woodPelletQty + r.dustPelletQty)));
    const dustShare = r.woodDustHarga - woodShare;
    INITIAL_ENTRIES.push({
      id: `row-${rowIdCounter}`,
      no: rowIdCounter++,
      namaPt: 'INDOPELLET',
      bahanBakar: 'DUST PELLET',
      tanggal: r.isoDate,
      mc: 8.5,
      calori: 4150,
      konsumsi: r.dustPelletQty,
      harga: Math.round(dustShare / r.dustPelletQty),
      totalHarga: dustShare,
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
