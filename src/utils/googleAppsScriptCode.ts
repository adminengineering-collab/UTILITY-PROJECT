/**
 * Google Apps Script (Code.gs) template for Boiler Fuel Consumption & Cost Monitoring
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ============================================================================
 * GOOGLE APPS SCRIPT: SISTEM MONITORING KONSUMSI & BIAYA BAHAN BAKAR BOILER
 * TACO ENGINEERING / UTILITY
 * ============================================================================
 * Fitur:
 * 1. doGet(e)          : Endpoint Web App (JSON) untuk sinkronisasi otomatis ke dashboard
 * 2. doPost(e)         : Endpoint untuk menerima entri bahan bakar baru dari dashboard
 * 3. onOpen()          : Menambahkan menu khusus 'Boiler Utility TACO' di Google Sheets
 * 4. setupTemplate()   : Membuat template kolom standar (No, PT, Bahan, Tanggal, MC, Calori, Qty, Harga, Total, Steam)
 * 5. autoCalculate()   : Menghitung ulang rumus Total Harga = Konsumsi * Harga
 */

// Ganti nama sheet jika berbeda, atau kosongkan untuk otomatis memakai sheet aktif pertama
var SHEET_NAME = 'Sheet1';

/**
 * 1. Menu Tambahan di Google Sheets
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🔥 Boiler Utility TACO')
    .addItem('📊 Buat Template Kolom Standar', 'setupTemplate')
    .addItem('⚡ Format & Hitung Ulang Total Harga', 'autoCalculate')
    .addSeparator()
    .addItem('ℹ️ Panduan Koneksi ke Dashboard Web', 'showInstructions')
    .addToUi();
}

/**
 * 2. Web App GET Handler (Dipanggil oleh Dashboard Monitoring secara Real-Time)
 */
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : null;
    if (!sheet) {
      sheet = ss.getSheets()[0];
    }

    var data = sheet.getDataRange().getValues();
    if (!data || data.length <= 1) {
      return respondJson({
        status: 'success',
        entries: [],
        steamData: {},
        message: 'Sheet kosong atau hanya ada baris header.'
      });
    }

    // Cari baris header
    var headerRowIndex = 0;
    var colMap = {
      no: 0,
      namaPt: 1,
      bahanBakar: 2,
      tanggal: 3,
      mc: 4,
      calori: 5,
      konsumsi: 6,
      harga: 7,
      totalHarga: 8,
      steamOut: 9
    };

    // Deteksi header dinamis
    for (var r = 0; r < Math.min(data.length, 5); r++) {
      var row = data[r];
      var rowStr = row.map(function(c) { return String(c || '').toUpperCase(); });
      var hasPt = rowStr.some(function(c) { return c.indexOf('PT') >= 0 || c.indexOf('VENDOR') >= 0 || c.indexOf('SUPPLIER') >= 0; });
      var hasBahan = rowStr.some(function(c) { return c.indexOf('BAHAN') >= 0 || c.indexOf('FUEL') >= 0 || c.indexOf('PELLET') >= 0; });

      if (hasPt || hasBahan) {
        headerRowIndex = r;
        rowStr.forEach(function(col, idx) {
          if (col.indexOf('NO') === 0) colMap.no = idx;
          else if (col.indexOf('PT') >= 0 || col.indexOf('VENDOR') >= 0 || col.indexOf('SUPPLIER') >= 0) colMap.namaPt = idx;
          else if (col.indexOf('BAHAN') >= 0 || col.indexOf('FUEL') >= 0) colMap.bahanBakar = idx;
          else if (col.indexOf('TANGGAL') >= 0 || col.indexOf('DATE') >= 0 || col === 'TGL') colMap.tanggal = idx;
          else if (col.indexOf('MC') >= 0 || col.indexOf('MOISTURE') >= 0) colMap.mc = idx;
          else if (col.indexOf('CALORI') >= 0 || col.indexOf('KALORI') >= 0) colMap.calori = idx;
          else if ((col.indexOf('KONSUMSI') >= 0 || col === 'KG') && col.indexOf('TOTAL') === -1) colMap.konsumsi = idx;
          else if (col.indexOf('HARGA') >= 0 && col.indexOf('TOTAL') === -1) colMap.harga = idx;
          else if (col.indexOf('TOTAL HARGA') >= 0 || col.indexOf('TOTAL BIAYA') >= 0) colMap.totalHarga = idx;
          else if (col.indexOf('STEAM') >= 0) colMap.steamOut = idx;
        });
        break;
      }
    }

    var entries = [];
    var steamData = {};
    var lastValidDate = '';

    for (var i = headerRowIndex + 1; i < data.length; i++) {
      var row = data[i];
      var rawPt = String(row[colMap.namaPt] || '').trim();
      if (!rawPt || rawPt.toUpperCase().indexOf('TOTAL') >= 0) continue;

      // Format tanggal ke YYYY-MM-DD
      var rawDate = row[colMap.tanggal];
      var tglIso = '';
      if (rawDate instanceof Date) {
        var y = rawDate.getFullYear();
        var m = ('0' + (rawDate.getMonth() + 1)).slice(-2);
        var d = ('0' + rawDate.getDate()).slice(-2);
        tglIso = y + '-' + m + '-' + d;
        lastValidDate = tglIso;
      } else if (rawDate) {
        var str = String(rawDate).trim();
        // Cek format DD/MM/YYYY
        if (str.indexOf('/') >= 0) {
          var p = str.split('/');
          if (p.length === 3) {
            var yy = p[2].trim();
            if (yy.length === 2) yy = '20' + yy;
            tglIso = yy + '-' + ('0' + p[1].trim()).slice(-2) + '-' + ('0' + p[0].trim()).slice(-2);
            lastValidDate = tglIso;
          }
        } else {
          tglIso = str;
          lastValidDate = str;
        }
      } else {
        tglIso = lastValidDate;
      }

      var konsumsi = cleanNum(row[colMap.konsumsi]);
      var harga = cleanNum(row[colMap.harga]);
      var total = cleanNum(row[colMap.totalHarga]) || (konsumsi * harga);
      var mc = cleanNum(row[colMap.mc]) || 6.5;
      var calori = row[colMap.calori] ? cleanNum(row[colMap.calori]) : null;

      // Steam out
      if (colMap.steamOut !== undefined && row[colMap.steamOut]) {
        var steamVal = cleanNum(row[colMap.steamOut]);
        if (steamVal > 0 && tglIso) {
          steamData[tglIso] = steamVal;
        }
      }

      entries.push({
        id: 'gs-row-' + i,
        no: Number(row[colMap.no]) || i,
        namaPt: rawPt.toUpperCase(),
        bahanBakar: normalizeFuel(row[colMap.bahanBakar]),
        tanggal: tglIso,
        mc: mc,
        calori: calori,
        konsumsi: konsumsi,
        harga: harga,
        totalHarga: total
      });
    }

    return respondJson({
      status: 'success',
      count: entries.length,
      updatedAt: new Date().toISOString(),
      entries: entries,
      steamData: steamData
    });

  } catch (error) {
    return respondJson({
      status: 'error',
      message: error.toString()
    });
  }
}

/**
 * 3. Web App POST Handler (Untuk penambahan data dari dashboard jika diinginkan)
 */
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : null;
    if (!sheet) sheet = ss.getSheets()[0];

    var body = JSON.parse(e.postData.contents);
    var lastRow = sheet.getLastRow();
    var nextRow = lastRow + 1;
    var nextNo = lastRow > 1 ? lastRow : 1;

    sheet.appendRow([
      nextNo,
      body.namaPt || '',
      body.bahanBakar || 'WOOD PELLET',
      body.tanggal || '',
      body.mc || 6.5,
      body.calori || '',
      body.konsumsi || 0,
      body.harga || 0,
      '=G' + nextRow + '*H' + nextRow,
      body.steamOut || ''
    ]);

    return respondJson({
      status: 'success',
      message: 'Data berhasil ditambahkan pada baris ' + nextRow
    });
  } catch (err) {
    return respondJson({
      status: 'error',
      message: err.toString()
    });
  }
}

/**
 * 4. Buat Template Sheet Baru secara Otomatis
 */
function setupTemplate() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Data Bahan Bakar');
  if (!sheet) {
    sheet = ss.insertSheet('Data Bahan Bakar');
  }

  var headers = [
    ['NO', 'NAMA PT', 'BAHAN BAKAR', 'TANGGAL', 'MC (%)', 'CALORI (kcal/kg)', 'KONSUMSI (KG)', 'HARGA (RP/KG)', 'TOTAL HARGA (RP)', 'STEAM OUT (TON)']
  ];

  sheet.getRange(1, 1, 1, 10).setValues(headers);

  // Styling Header
  var headerRange = sheet.getRange(1, 1, 1, 10);
  headerRange.setBackground('#0f172a');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  headerRange.setFontFamily('Roboto');

  // Format Kolom
  sheet.getRange('A:A').setHorizontalAlignment('center');
  sheet.getRange('B:B').setHorizontalAlignment('left');
  sheet.getRange('C:C').setHorizontalAlignment('center');
  sheet.getRange('D:D').setNumberFormat('dd/mm/yyyy').setHorizontalAlignment('center');
  sheet.getRange('E:E').setNumberFormat('0.0"%"').setHorizontalAlignment('right');
  sheet.getRange('F:F').setNumberFormat('#,##0').setHorizontalAlignment('right');
  sheet.getRange('G:G').setNumberFormat('#,##0').setHorizontalAlignment('right');
  sheet.getRange('H:H').setNumberFormat('"Rp"#,##0').setHorizontalAlignment('right');
  sheet.getRange('I:I').setNumberFormat('"Rp"#,##0').setHorizontalAlignment('right');
  sheet.getRange('J:J').setNumberFormat('#,##0.0').setHorizontalAlignment('center');

  sheet.setFrozenRows(1);
  SpreadsheetApp.getUi().alert('✅ Template Berhasil Dibuat!\nSheet: "Data Bahan Bakar"');
}

/**
 * 5. Hitung Ulang & Perbarui Formula Kolom Total Harga
 */
function autoCalculate() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  for (var r = 2; r <= lastRow; r++) {
    sheet.getRange('I' + r).setFormula('=G' + r + '*H' + r);
  }
  SpreadsheetApp.getUi().alert('✅ Rumus Total Harga berhasil diterapkan untuk ' + (lastRow - 1) + ' baris!');
}

/**
 * 6. Bantuan & Panduan
 */
function showInstructions() {
  SpreadsheetApp.getUi().alert(
    'Langkah Deployment Web App:\n\n' +
    '1. Klik menu "Deploy" (Terapkan) di kanan atas Apps Script.\n' +
    '2. Pilih "New deployment" (Deployment baru).\n' +
    '3. Pilih type "Web app" (Aplikasi web).\n' +
    '4. Set "Execute as": Me (Saya).\n' +
    '5. Set "Who has access": Anyone (Siapa saja).\n' +
    '6. Klik Deploy, lalu Salin Web App URL ke Dashboard Monitoring.'
  );
}

// Helper: Bersihkan Angka
function cleanNum(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  var s = String(val).replace(/Rp|\\s/gi, '').replace(/,/g, '');
  return parseFloat(s) || 0;
}

// Helper: Normalisasi Bahan Bakar
function normalizeFuel(str) {
  var s = String(str || '').toUpperCase();
  if (s.indexOf('CANGKANG') >= 0 || s.indexOf('SAWIT') >= 0) return 'CANGKANG';
  if (s.indexOf('DUST') >= 0 || s.indexOf('SERBUK') >= 0) return 'DUST PELLET';
  if (s.indexOf('KOPI') >= 0 || s.indexOf('COFFEE') >= 0) return 'KOPI PELLET';
  return 'WOOD PELLET';
}

// Helper: Response JSON
function respondJson(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
