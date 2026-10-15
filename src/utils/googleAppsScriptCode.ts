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
    .addItem('📊 Buat Template 18 Kolom (Format Lengkap)', 'setupDailyMatrixTemplate')
    .addItem('📋 Buat Template Kolom Standar Log', 'setupTemplate')
    .addItem('💰 Format Kolom Biaya & Harga ke Rupiah (Rp)', 'formatColumnsToRupiah')
    .addItem('⚡ Format & Hitung Ulang Rumus Otomatis', 'autoCalculate')
    .addSeparator()
    .addItem('ℹ️ Panduan Koneksi ke Dashboard Web', 'showInstructions')
    .addToUi();
}

/**
 * 2. Web App GET Handler (Dipanggil oleh Dashboard Monitoring secara Real-Time)
 * Mendukung pembacaan sheet bulanan (Agustus, September, Sheet1) dan kedua format (10 kolom transaksi & 18 kolom matrix)
 */
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var paramSheet = (e && e.parameter && e.parameter.sheet) ? e.parameter.sheet : '';
    var sheet = paramSheet ? ss.getSheetByName(paramSheet) : (SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : null);
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

    // Periksa apakah format 18 kolom matrix harian
    var firstRowStr = data[0].map(function(c) { return String(c || '').toUpperCase(); });
    var isMatrix = firstRowStr.some(function(c) { return c.indexOf('TOTAL CANGKANG') >= 0 || c.indexOf('KG/TON') >= 0; });

    var entries = [];
    var steamData = {};
    var lastValidDate = '';

    if (isMatrix) {
      // Mapping kolom matrix 18/17 kolom
      var mCol = { date: 0, steam: 3, cQty: 6, wQty: 7, dQty: 8, kQty: 9, cHrg: 10, wHrg: 11, dHrg: 12, kHrg: 13 };
      firstRowStr.forEach(function(h, idx) {
        if (h === 'DATE' || h === 'TANGGAL') mCol.date = idx;
        else if (h.indexOf('STEAM OUT') >= 0) mCol.steam = idx;
        else if (h.indexOf('CANGKANG') >= 0 && h.indexOf('HARGA') === -1) mCol.cQty = idx;
        else if (h.indexOf('WOOD') >= 0 && h.indexOf('HARGA') === -1 && h.indexOf('DUST') === -1) mCol.wQty = idx;
        else if (h.indexOf('DUST') >= 0 && h.indexOf('HARGA') === -1) mCol.dQty = idx;
        else if (h.indexOf('KOPI') >= 0 && h.indexOf('HARGA') === -1) mCol.kQty = idx;
        else if (h.indexOf('HARGA CANGKANG') >= 0) mCol.cHrg = idx;
        else if (h.indexOf('HARGA WOOD') >= 0) mCol.wHrg = idx;
        else if (h.indexOf('HARGA DUST') >= 0) mCol.dHrg = idx;
        else if (h.indexOf('HARGA KOPI') >= 0) mCol.kHrg = idx;
      });

      var counter = 1;
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var rawDate = row[mCol.date];
        if (!rawDate || String(rawDate).toUpperCase().indexOf('TOTAL') >= 0) continue;

        var tglIso = formatToIsoDate(rawDate, lastValidDate);
        if (!tglIso) continue;
        lastValidDate = tglIso;

        var steamVal = cleanNum(row[mCol.steam]);
        if (steamVal > 0) steamData[tglIso] = steamVal;

        var cQ = cleanNum(row[mCol.cQty]);
        var cH = cleanNum(row[mCol.cHrg]);
        if (cQ > 0 || cH > 0) {
          var uH = (cQ > 0 && cH > 0) ? Math.round(cH / cQ) : 1710;
          entries.push({
            id: 'matrix-c-' + i,
            no: counter++,
            namaPt: 'SAMCA',
            bahanBakar: 'CANGKANG',
            tanggal: tglIso,
            mc: 18.2,
            calori: 4100,
            konsumsi: cQ,
            harga: uH,
            totalHarga: cH || (cQ * uH)
          });
        }

        var wQ = cleanNum(row[mCol.wQty]);
        var wH = cleanNum(row[mCol.wHrg]);
        if (wQ > 0 || wH > 0) {
          var uW = (wQ > 0 && wH > 0) ? Math.round(wH / wQ) : 1788;
          entries.push({
            id: 'matrix-w-' + i,
            no: counter++,
            namaPt: 'WIRABUMI',
            bahanBakar: 'WOOD PELLET',
            tanggal: tglIso,
            mc: 6.8,
            calori: 4320,
            konsumsi: wQ,
            harga: uW,
            totalHarga: wH || (wQ * uW)
          });
        }

        var dQ = cleanNum(row[mCol.dQty]);
        var dH = cleanNum(row[mCol.dHrg]);
        if (dQ > 0 || dH > 0) {
          var uD = (dQ > 0 && dH > 0) ? Math.round(dH / dQ) : 1950;
          entries.push({
            id: 'matrix-d-' + i,
            no: counter++,
            namaPt: 'INDOPELLET',
            bahanBakar: 'DUST PELLET',
            tanggal: tglIso,
            mc: 8.5,
            calori: 4150,
            konsumsi: dQ,
            harga: uD,
            totalHarga: dH || (dQ * uD)
          });
        }

        var kQ = cleanNum(row[mCol.kQty]);
        var kH = cleanNum(row[mCol.kHrg]);
        if (kQ > 0 || kH > 0) {
          var uK = (kQ > 0 && kH > 0) ? Math.round(kH / kQ) : 2200;
          entries.push({
            id: 'matrix-k-' + i,
            no: counter++,
            namaPt: 'MARSHARI',
            bahanBakar: 'KOPI PELLET',
            tanggal: tglIso,
            mc: 9.3,
            calori: 3950,
            konsumsi: kQ,
            harga: uK,
            totalHarga: kH || (kQ * uK)
          });
        }
      }

      return respondJson({
        status: 'success',
        format: 'matrix',
        count: entries.length,
        updatedAt: new Date().toISOString(),
        entries: entries,
        steamData: steamData
      });
    }

    // Format log 10 kolom standar
    var headerRowIndex = 0;
    var colMap = { no: 0, namaPt: 1, bahanBakar: 2, tanggal: 3, mc: 4, calori: 5, konsumsi: 6, harga: 7, totalHarga: 8, steamOut: 9 };

    for (var r = 0; r < Math.min(data.length, 5); r++) {
      var rowStr = data[r].map(function(c) { return String(c || '').toUpperCase(); });
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

    for (var i = headerRowIndex + 1; i < data.length; i++) {
      var row = data[i];
      var rawPt = String(row[colMap.namaPt] || '').trim();
      if (!rawPt || rawPt.toUpperCase().indexOf('TOTAL') >= 0) continue;

      var tglIso = formatToIsoDate(row[colMap.tanggal], lastValidDate);
      if (tglIso) lastValidDate = tglIso;

      var konsumsi = cleanNum(row[colMap.konsumsi]);
      var harga = cleanNum(row[colMap.harga]);
      var total = cleanNum(row[colMap.totalHarga]) || (konsumsi * harga);
      var mc = cleanNum(row[colMap.mc]) || 6.5;
      var calori = row[colMap.calori] ? cleanNum(row[colMap.calori]) : null;

      if (colMap.steamOut !== undefined && row[colMap.steamOut]) {
        var steamVal = cleanNum(row[colMap.steamOut]);
        if (steamVal > 0 && tglIso) steamData[tglIso] = steamVal;
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

// Helper: Format tanggal ke YYYY-MM-DD
function formatToIsoDate(raw, lastValid) {
  if (raw instanceof Date) {
    var y = raw.getFullYear();
    var m = ('0' + (raw.getMonth() + 1)).slice(-2);
    var d = ('0' + raw.getDate()).slice(-2);
    return y + '-' + m + '-' + d;
  }
  if (!raw) return lastValid || '';
  var str = String(raw).trim();
  if (str.indexOf('/') >= 0) {
    var p = str.split('/');
    if (p.length === 3) {
      var yy = p[2].trim();
      if (yy.length === 2) yy = '20' + yy;
      var p1 = parseInt(p[0].trim(), 10);
      var p2 = parseInt(p[1].trim(), 10);
      // Deteksi MM/DD vs DD/MM
      if (p2 > 12 && p1 <= 12) {
        return yy + '-' + ('0' + p1).slice(-2) + '-' + ('0' + p2).slice(-2);
      }
      return yy + '-' + ('0' + p2).slice(-2) + '-' + ('0' + p1).slice(-2);
    }
  }
  return str;
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
 * 4b. Buat Template 18 Kolom Lengkap (Sesuai Format Dashboard & Monitoring Boiler)
 */
function setupDailyMatrixTemplate() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Monitoring Boiler 18 Kolom');
  if (!sheet) {
    sheet = ss.insertSheet('Monitoring Boiler 18 Kolom');
  }

  var headers = [
    [
      'DATE',
      'TOTAL QTY',
      'TOTAL HARGA',
      'STEAM OUT',
      'KG/Ton Steam',
      'Rp/Ton STEAM',
      'TOTAL CANGKANG SAWIT',
      'TOTAL WOOD PELLET',
      'TOTAL DUST PELLET',
      'TOTAL KOPI PELLET',
      'TOTAL HARGA CANGKANG SAWIT',
      'TOTAL HARGA WOOD PELLET',
      'TOTAL HARGA DUST PELLET',
      'TOTAL HARGA KOPI PELLET',
      '% TOTAL CANGKANG SAWIT',
      '% TOTAL WOOD PELLET',
      '% TOTAL DUST PELLET',
      '% TOTAL KOPI PELLET'
    ]
  ];

  sheet.getRange(1, 1, 1, 18).setValues(headers);

  // Styling Header
  var headerRange = sheet.getRange(1, 1, 1, 18);
  headerRange.setBackground('#0f172a');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  headerRange.setFontFamily('Roboto');

  sheet.getRange('A:A').setNumberFormat('dd/mm/yyyy').setHorizontalAlignment('center');
  sheet.getRange('B:B').setNumberFormat('#,##0').setHorizontalAlignment('right');
  sheet.getRange('C:C').setNumberFormat('"Rp"#,##0.00').setHorizontalAlignment('right');
  sheet.getRange('D:D').setNumberFormat('#,##0').setHorizontalAlignment('right');
  sheet.getRange('E:E').setNumberFormat('#,##0').setHorizontalAlignment('right');
  sheet.getRange('F:F').setNumberFormat('"Rp"#,##0.00').setHorizontalAlignment('right');
  sheet.getRange('G:J').setNumberFormat('#,##0').setHorizontalAlignment('right');
  sheet.getRange('K:N').setNumberFormat('"Rp"#,##0').setHorizontalAlignment('right');
  sheet.getRange('O:R').setNumberFormat('0"%"').setHorizontalAlignment('right');

  sheet.setFrozenRows(1);
  SpreadsheetApp.getUi().alert('✅ Template 18 Kolom Berhasil Dibuat!\nSheet: "Monitoring Boiler 18 Kolom"');
}

/**
 * 5. Trigger Otomatis saat Ada Perubahan Data di Spreadsheet (onEdit)
 */
function onEdit(e) {
  try {
    var range = e.range;
    var sheet = range.getSheet();
    var row = range.getRow();
    var col = range.getColumn();
    
    if (row < 2) return;

    var firstRowHeaders = sheet.getRange(1, 1, 1, 18).getValues()[0];
    var is18Col = firstRowHeaders.some(function(h) { return String(h || '').indexOf('TOTAL CANGKANG') >= 0; });

    if (is18Col) {
      // 18 Kolom: Total QTY (B) = G + H + I + J
      // Total Harga (C) = K + L + M + N
      // Kg/Ton Steam (E) = B / D
      // Rp/Ton Steam (F) = C / D
      // % Cangkang (O) = G / B, dsb.
      sheet.getRange(row, 2).setFormula('=G' + row + '+H' + row + '+I' + row + '+J' + row);
      sheet.getRange(row, 3).setFormula('=K' + row + '+L' + row + '+M' + row + '+N' + row);
      sheet.getRange(row, 5).setFormula('=IF(D' + row + '>0, ROUND(B' + row + '/D' + row + '), 0)');
      sheet.getRange(row, 6).setFormula('=IF(D' + row + '>0, C' + row + '/D' + row + ', 0)');
      sheet.getRange(row, 15).setFormula('=IF(B' + row + '>0, G' + row + '/B' + row + ', 0)');
      sheet.getRange(row, 16).setFormula('=IF(B' + row + '>0, H' + row + '/B' + row + ', 0)');
      sheet.getRange(row, 17).setFormula('=IF(B' + row + '>0, I' + row + '/B' + row + ', 0)');
      sheet.getRange(row, 18).setFormula('=IF(B' + row + '>0, J' + row + '/B' + row + ', 0)');
    } else {
      // Format 10 kolom standar: Konsumsi (G) * Harga (H) = Total Harga (I)
      if (col === 7 || col === 8) {
        sheet.getRange(row, 9).setFormula('=G' + row + '*H' + row);
      }
    }
  } catch (err) {
    // Silent catch on edit trigger
  }
}

/**
 * 6. Format Kolom Biaya & Harga ke Format Mata Uang Rupiah (Rp)
 */
function formatColumnsToRupiah() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert('Tidak ada baris data untuk diformat.');
    return;
  }

  var firstRow = sheet.getRange(1, 1, 1, 18).getValues()[0];
  var is18Col = firstRow.some(function(h) { return String(h || '').indexOf('TOTAL CANGKANG') >= 0; });

  if (is18Col) {
    // Kolom C (Total Harga) & Kolom F (Rp/Ton Steam)
    sheet.getRange(2, 3, lastRow - 1, 1).setNumberFormat('"Rp"#,##0.00');
    sheet.getRange(2, 6, lastRow - 1, 1).setNumberFormat('"Rp"#,##0.00');
    // Kolom K s/d N (Total Harga Cangkang, Wood, Dust, Kopi)
    sheet.getRange(2, 11, lastRow - 1, 4).setNumberFormat('"Rp"#,##0');
  } else {
    // Log 10 kolom: Kolom H (Harga Satuan) & Kolom I (Total Harga)
    sheet.getRange(2, 8, lastRow - 1, 2).setNumberFormat('"Rp"#,##0');
  }

  SpreadsheetApp.getUi().alert('✅ Berhasil memformat seluruh kolom biaya & harga ke format mata uang Rupiah (Rp) untuk ' + (lastRow - 1) + ' baris!');
}

/**
 * 7. Hitung Ulang & Perbarui Formula Kolom Otomatis
 */
function autoCalculate() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var firstRowHeaders = sheet.getRange(1, 1, 1, 18).getValues()[0];
  var is18Col = firstRowHeaders.some(function(h) { return String(h || '').indexOf('TOTAL CANGKANG') >= 0; });

  for (var r = 2; r <= lastRow; r++) {
    if (is18Col) {
      sheet.getRange(r, 2).setFormula('=G' + r + '+H' + r + '+I' + r + '+J' + r);
      sheet.getRange(r, 3).setFormula('=K' + r + '+L' + r + '+M' + r + '+N' + r);
      sheet.getRange(r, 5).setFormula('=IF(D' + r + '>0, ROUND(B' + r + '/D' + r + '), 0)');
      sheet.getRange(r, 6).setFormula('=IF(D' + r + '>0, C' + r + '/D' + r + ', 0)');
      sheet.getRange(r, 15).setFormula('=IF(B' + r + '>0, G' + r + '/B' + r + ', 0)');
      sheet.getRange(r, 16).setFormula('=IF(B' + r + '>0, H' + r + '/B' + r + ', 0)');
      sheet.getRange(r, 17).setFormula('=IF(B' + r + '>0, I' + r + '/B' + r + ', 0)');
      sheet.getRange(r, 18).setFormula('=IF(B' + r + '>0, J' + r + '/B' + r + ', 0)');
    } else {
      sheet.getRange('I' + r).setFormula('=G' + r + '*H' + r);
    }
  }
  SpreadsheetApp.getUi().alert('✅ Rumus berhasil diterapkan untuk ' + (lastRow - 1) + ' baris!');
}

/**
 * 7. Bantuan & Panduan
 */
function showInstructions() {
  SpreadsheetApp.getUi().alert(
    'Langkah Sinkronisasi Otomatis:\n\n' +
    '1. Setiap penambahan baris baru di Google Sheets ini akan otomatis tersinkronisasi ke Dashboard Web.\n' +
    '2. Dashboard memiliki fitur Auto-Sync Polling yang aktif memeriksa penambahan data setiap 10-30 detik.\n' +
    '3. Untuk koneksi instan, gunakan URL Web App (Deploy > New Deployment > Web app > Anyone) atau link Share View spreadsheet ini.'
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
