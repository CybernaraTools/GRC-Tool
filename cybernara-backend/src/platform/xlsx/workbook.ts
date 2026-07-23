import ExcelJS from "exceljs";

export interface WorksheetRow {
  rowNumber: number;
  values: string[];
}

export interface WorksheetSnapshot {
  name: string;
  rowCount: number;
  columnCount: number;
  rows: WorksheetRow[];
}

export interface WorkbookSnapshot {
  fileName: string;
  sheets: WorksheetSnapshot[];
}

export async function readWorkbook(filePath: string, fileName: string): Promise<WorkbookSnapshot> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  return {
    fileName,
    sheets: workbook.worksheets.map((worksheet) => ({
      name: worksheet.name,
      rowCount: worksheet.rowCount,
      columnCount: worksheet.columnCount,
      rows: collectRows(worksheet)
    }))
  };
}

export function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\r\n]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findSheet(workbook: WorkbookSnapshot, selector: string): WorksheetSnapshot | undefined {
  const normalizedSelector = normalizeHeader(selector);
  return workbook.sheets.find((sheet) => normalizeHeader(sheet.name).includes(normalizedSelector));
}

function collectRows(worksheet: ExcelJS.Worksheet): WorksheetRow[] {
  const rows: WorksheetRow[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const rowValues = row.values as unknown[];
    rows.push({
      rowNumber,
      values: rowValues.slice(1).map(cellToText)
    });
  });
  return rows;
}

function cellToText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    const maybeCell = value as { text?: string; result?: unknown; richText?: Array<{ text: string }> };
    if (maybeCell.text) {
      return maybeCell.text.trim();
    }
    if (maybeCell.richText) {
      return maybeCell.richText.map((part) => part.text).join("").trim();
    }
    if (maybeCell.result !== undefined) {
      return String(maybeCell.result).trim();
    }
  }

  return String(value).trim();
}
