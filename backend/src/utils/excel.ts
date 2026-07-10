import ExcelJS from 'exceljs';
import { BadRequestError } from '../errors/index.js';

export async function parseExcel<T>(buffer: any, requiredColumns: string[]): Promise<any[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new BadRequestError('File Excel kosong');

  const rows: any[] = [];
  const headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value?.toString().trim() || '';
      });
      
      // Validate headers
      const missing = requiredColumns.filter(col => !headers.includes(col));
      if (missing.length > 0) {
        throw new BadRequestError(`Kolom berikut wajib ada: ${missing.join(', ')}`);
      }
    } else {
      const rowData: any = {};
      row.eachCell((cell, colNumber) => {
        if (headers[colNumber]) {
          rowData[headers[colNumber]] = cell.value;
        }
      });
      rows.push(rowData);
    }
  });

  return rows;
}

export async function generateExcelTemplate(
  headers: string[],
  sheetName: string = 'Template',
  sampleData?: Record<string, any>
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.addRow(headers);
  if (sampleData) {
    const row = headers.map(h => sampleData[h] || '');
    worksheet.addRow(row);
  }

  // Auto fit columns
  worksheet.columns.forEach(column => {
    column.width = 20;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as unknown as Buffer;
}
