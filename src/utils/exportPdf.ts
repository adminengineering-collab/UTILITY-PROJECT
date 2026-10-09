import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FuelEntry, DailyFuelSummary } from '../types/boiler';
import { formatNumber, formatRupiah, formatDisplayDate } from './calculations';

export interface AuditPdfOptions {
  companyName?: string;
  department?: string;
  periodText?: string;
  auditorName?: string;
  auditorTitle?: string;
  notes?: string;
}

export function exportAuditReportPdf(
  summaries: DailyFuelSummary[],
  entries: FuelEntry[],
  options: AuditPdfOptions = {}
) {
  const {
    companyName = 'PT TACO INDONESIA',
    department = 'Engineering & Boiler Utility Division',
    periodText = 'Semua Periode Tercatat',
    auditorName = 'admin.engineering@taco.co.id',
    auditorTitle = 'Boiler Utility Lead / Auditor',
    notes = 'Laporan audit diverifikasi berdasarkan pembacaan flowmeter, flow steam out, dan rekonsiliasi timbangan bahan bakar.',
  } = options;

  // Landscape for rich multi-column industrial table
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header Background bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 24, 'F');

  // Brand and Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`${companyName} — AUDIT MONITORING BAHAN BAKAR BOILER`, 14, 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`${department} | Periode Audit: ${periodText}`, 14, 16);
  doc.text(`Waktu Cetak: ${new Date().toLocaleString('id-ID')} | Dicetak oleh: ${auditorName}`, 14, 21);

  // Totals calculation
  let grandTotalKonsumsi = 0;
  let grandTotalHarga = 0;
  let grandTotalSteam = 0;

  for (const s of summaries) {
    grandTotalKonsumsi += s.totalKonsumsi;
    grandTotalHarga += s.totalHarga;
    grandTotalSteam += s.steamOut;
  }

  const avgKgPerTonSteam = grandTotalSteam > 0 ? (grandTotalKonsumsi / grandTotalSteam).toFixed(1) : '0';
  const avgRpPerTonSteam = grandTotalSteam > 0 ? grandTotalHarga / grandTotalSteam : 0;

  // KPI Summary Stat Boxes
  const kpiY = 28;
  const boxWidth = (pageWidth - 28 - 15) / 4;
  const boxHeight = 16;

  const kpis = [
    { label: 'TOTAL KONSUMSI', val: `${formatNumber(grandTotalKonsumsi)} kg`, sub: `(${(grandTotalKonsumsi / 1000).toFixed(1)} Ton)` },
    { label: 'TOTAL BIAYA BAHAN BAKAR', val: formatRupiah(grandTotalHarga), sub: `${summaries.length} Hari Operasional` },
    { label: 'TOTAL STEAM DIHASILKAN', val: `${formatNumber(grandTotalSteam)} Ton`, sub: 'Boiler Output' },
    { label: 'BIAYA RATA-RATA STEAM', val: `${formatRupiah(avgRpPerTonSteam)}/Ton`, sub: `Ratio: ${avgKgPerTonSteam} kg/Ton` },
  ];

  kpis.forEach((kpi, index) => {
    const x = 14 + index * (boxWidth + 5);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(x, kpiY, boxWidth, boxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(kpi.label, x + 4, kpiY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(kpi.val, x + 4, kpiY + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(kpi.sub, x + 4, kpiY + 14);
  });

  // Table 1: Daily Fuel Breakdown Summary
  const table1Headers = [
    'Tanggal',
    'Cangkang (kg)',
    'Wood Pellet (kg)',
    'Dust Pellet (kg)',
    'Kopi Pellet (kg)',
    'Total Konsumsi',
    'Total Harga (Rp)',
    'Steam Out',
    'Kg/Ton Steam',
    'Rp/Ton Steam'
  ];

  const table1Rows = summaries.map((s) => [
    s.displayTanggal,
    s.breakdown['CANGKANG'].konsumsi > 0 ? formatNumber(s.breakdown['CANGKANG'].konsumsi) : '-',
    s.breakdown['WOOD PELLET'].konsumsi > 0 ? formatNumber(s.breakdown['WOOD PELLET'].konsumsi) : '-',
    s.breakdown['DUST PELLET'].konsumsi > 0 ? formatNumber(s.breakdown['DUST PELLET'].konsumsi) : '-',
    s.breakdown['KOPI PELLET'].konsumsi > 0 ? formatNumber(s.breakdown['KOPI PELLET'].konsumsi) : '-',
    formatNumber(s.totalKonsumsi) + ' kg',
    formatRupiah(s.totalHarga),
    s.steamOut > 0 ? formatNumber(s.steamOut) + ' Ton' : '-',
    s.kgPerTonSteam > 0 ? s.kgPerTonSteam.toString() : '-',
    s.rpPerTonSteam > 0 ? formatRupiah(s.rpPerTonSteam, true) : '-'
  ]);

  // Append Total Row
  table1Rows.push([
    'TOTAL / AVG',
    formatNumber(summaries.reduce((acc, s) => acc + s.breakdown['CANGKANG'].konsumsi, 0)),
    formatNumber(summaries.reduce((acc, s) => acc + s.breakdown['WOOD PELLET'].konsumsi, 0)),
    formatNumber(summaries.reduce((acc, s) => acc + s.breakdown['DUST PELLET'].konsumsi, 0)),
    formatNumber(summaries.reduce((acc, s) => acc + s.breakdown['KOPI PELLET'].konsumsi, 0)),
    formatNumber(grandTotalKonsumsi) + ' kg',
    formatRupiah(grandTotalHarga),
    formatNumber(grandTotalSteam) + ' Ton',
    avgKgPerTonSteam,
    formatRupiah(avgRpPerTonSteam, true)
  ]);

  autoTable(doc, {
    startY: kpiY + boxHeight + 6,
    head: [table1Headers],
    body: table1Rows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
      6: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] },
      7: { halign: 'center' },
      8: { halign: 'center' },
      9: { halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Highlight the total summary row
      if (data.row.index === table1Rows.length - 1) {
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // Table 2: Detailed Entries on New Page or Continued
  doc.addPage('a4', 'landscape');

  // Page 2 Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`RINCIAN TRANSAKSI PENERIMAAN & KONSUMSI BAHAN BAKAR (RAW LOG)`, 14, 10);
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Total ${entries.length} baris data transaksi terverifikasi`, pageWidth - 80, 10);

  const table2Headers = [
    'No',
    'Nama PT / Supplier',
    'Bahan Bakar',
    'Tanggal',
    'MC (%)',
    'Calori',
    'Konsumsi (kg)',
    'Harga (Rp/kg)',
    'Total Harga (Rp)'
  ];

  const table2Rows = entries.map((e, idx) => [
    idx + 1,
    e.namaPt,
    e.bahanBakar,
    formatDisplayDate(e.tanggal),
    e.mc.toFixed(2),
    e.calori !== null ? e.calori.toString() : '-',
    formatNumber(e.konsumsi),
    formatNumber(e.harga),
    formatRupiah(e.totalHarga),
  ]);

  autoTable(doc, {
    startY: 22,
    head: [table2Headers],
    body: table2Rows,
    theme: 'grid',
    headStyles: {
      fillColor: [51, 65, 85], // slate-700
      textColor: [255, 255, 255],
      fontSize: 7.5,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 1.8,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left', fontStyle: 'bold' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'center' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right', fontStyle: 'bold' },
    },
  });

  // Footer & Audit Signature Block on the last page
  const finalY = (doc as any).lastAutoTable?.finalY || 130;
  const sigY = Math.min(finalY + 12, pageHeight - 38);

  // Notes
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Catatan Audit: ${notes}`, 14, sigY);

  // Signature columns
  const sigColWidth = 60;
  const col1X = 20;
  const col2X = (pageWidth - sigColWidth) / 2;
  const col3X = pageWidth - sigColWidth - 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  // 1. Prepared by
  doc.text('Dibuat & Diverifikasi:', col1X, sigY + 8);
  doc.text('Operator / Tim Utility', col1X, sigY + 12);
  doc.line(col1X, sigY + 28, col1X + sigColWidth, sigY + 28);
  doc.text('( ........................................ )', col1X, sigY + 32);

  // 2. Checked by
  doc.text('Diperiksa Oleh:', col2X, sigY + 8);
  doc.text('Supervisor Boiler Engineering', col2X, sigY + 12);
  doc.line(col2X, sigY + 28, col2X + sigColWidth, sigY + 28);
  doc.text('( ........................................ )', col2X, sigY + 32);

  // 3. Approved by
  doc.text('Disetujui Oleh:', col3X, sigY + 8);
  doc.text('Plant Engineering Manager', col3X, sigY + 12);
  doc.line(col3X, sigY + 28, col3X + sigColWidth, sigY + 28);
  doc.text(`( ${auditorTitle} )`, col3X, sigY + 32);

  // Save PDF
  const filename = `Laporan_Audit_Bahan_Bakar_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
