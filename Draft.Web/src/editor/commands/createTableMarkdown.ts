export type CreateTableMarkdownData = {
  headers: string[]
  rows: string[][]
}

function normalizeTableCell(value: string) {
  return value.replace(/\r\n|\r|\n/gu, ' ').replace(/\|/gu, '\\|')
}

function createTableRow(cells: string[], columnCount: number) {
  const renderedCells = Array.from({ length: columnCount }, (_, index) =>
    normalizeTableCell(cells[index] ?? ''),
  )

  return `| ${renderedCells.join(' | ')} |`
}

export function createTableMarkdown({
  headers,
  rows,
}: CreateTableMarkdownData) {
  const columnCount = headers.length

  if (columnCount === 0) {
    return ''
  }

  return [
    createTableRow(headers, columnCount),
    `|${Array.from({ length: columnCount }, () => '---').join('|')}|`,
    ...rows.map((row) => createTableRow(row, columnCount)),
  ].join('\n')
}
