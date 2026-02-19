/**
 * Data export utilities — all use dynamic imports to keep initial bundle small.
 */

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export async function exportToCSV(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string,
): Promise<void> {
  const XLSX = await import('xlsx');

  const rows = data.map((row) => Object.fromEntries(columns.map((col) => [col.header, row[col.key] ?? ''])));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Export');
  XLSX.writeFile(wb, `${filename}.csv`, { bookType: 'csv' });
}

export async function exportToExcel(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string,
): Promise<void> {
  const XLSX = await import('xlsx');

  const rows = data.map((row) => Object.fromEntries(columns.map((col) => [col.header, row[col.key] ?? ''])));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  ws['!cols'] = columns.map((col) => ({ wch: col.width || 15 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Export');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function exportToPDF(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string,
  title?: string,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'landscape' });

  if (title) {
    doc.setFontSize(14);
    doc.text(title, 14, 15);
  }

  autoTable(doc, {
    startY: title ? 25 : 10,
    head: [columns.map((c) => c.header)],
    body: data.map((row) => columns.map((col) => String(row[col.key] ?? ''))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 30, 30] },
  });

  doc.save(`${filename}.pdf`);
}
