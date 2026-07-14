const ORDERED_LIST_ITEM_PATTERN =
  /^((?:[ \t]*>[ \t]?)*)([ \t]*)(\d+)([.)])([ \t]+)(.*)$/u

export type MarkdownOrderedListItem = {
  blockquotePrefix: string
  content: string
  delimiter: '.' | ')'
  indentation: string
  numberEndOffset: number
  numberStartOffset: number
  numberText: string
  prefix: string
  spacing: string
}

export function parseMarkdownOrderedListItem(
  line: string,
): MarkdownOrderedListItem | null {
  const match = line.match(ORDERED_LIST_ITEM_PATTERN)

  if (!match) {
    return null
  }

  const blockquotePrefix = match[1] ?? ''
  const indentation = match[2] ?? ''
  const prefix = `${blockquotePrefix}${indentation}`
  const numberText = match[3] ?? '1'

  return {
    blockquotePrefix,
    content: match[6] ?? '',
    delimiter: match[4] === ')' ? ')' : '.',
    indentation,
    numberEndOffset: prefix.length + numberText.length,
    numberStartOffset: prefix.length,
    numberText,
    prefix,
    spacing: match[5] ?? ' ',
  }
}

export function getNextOrderedListNumber(numberText: string) {
  return String(Number.parseInt(numberText, 10) + 1)
}

export function createIncrementedOrderedListItem(
  item: MarkdownOrderedListItem,
) {
  return `${item.prefix}${getNextOrderedListNumber(item.numberText)}${item.delimiter}${item.spacing}${item.content}`
}
