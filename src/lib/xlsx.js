import writeExcelFile from 'write-excel-file/browser'

// Excel limits sheet names to 31 characters and forbids : \ / ? * [ ]
export function sheetName(label, prefix) {
  return `${prefix} ${label}`.replace(/[:\\/?*[\]]/g, '-').slice(0, 31)
}

function autoWidth(rows) {
  const widths = []
  for (const row of rows) {
    row.forEach((cell, i) => {
      const len = String(cell ?? '').length
      widths[i] = Math.min(60, Math.max(widths[i] || 10, len + 2))
    })
  }
  return widths.map((width) => ({ width }))
}

// sheets: [{ name, rows }] where rows is an array of arrays (first row = header).
export async function downloadWorkbook(fileName, sheets) {
  await writeExcelFile(
    sheets.map(({ name, rows }) => ({
      sheet: name,
      data: rows.map((row) => row.map((cell) => (cell === undefined || cell === '' ? null : cell))),
      columns: autoWidth(rows),
      stickyRowsCount: 1,
    }))
  ).toFile(fileName)
}
