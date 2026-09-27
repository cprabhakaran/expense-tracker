import * as XLSX from 'xlsx';

import type { SheetGrid } from './statement';

/** Reads every sheet of an .xls, .xlsx or .csv file into grids of raw cell values. */
export function readWorkbook(data: ArrayBuffer | Uint8Array | string, type: 'array' | 'base64' = 'array'): SheetGrid[] {
  const workbook = XLSX.read(data, { type, cellDates: false, raw: false });
  return workbook.SheetNames.map((name) =>
    XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1, raw: false, defval: '' }),
  );
}
