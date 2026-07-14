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

export type MarkdownOrderedListRenumbering = {
  item: MarkdownOrderedListItem
  lineNumber: number
  numberText: string
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
  return createOrderedListItemWithNumber(
    item,
    getNextOrderedListNumber(item.numberText),
  )
}

export function createOrderedListItemWithNumber(
  item: MarkdownOrderedListItem,
  numberText: string,
) {
  return `${item.prefix}${numberText}${item.delimiter}${item.spacing}${item.content}`
}

export function getFollowingOrderedListRenumberings(
  getLineContent: (lineNumber: number) => string,
  lineCount: number,
  lineNumber: number,
  precedingItem: MarkdownOrderedListItem,
  precedingNumberText: string,
) {
  const renumberings: MarkdownOrderedListRenumbering[] = []
  let nextNumberText = getNextOrderedListNumber(precedingNumberText)

  for (
    let followingLineNumber = lineNumber + 1;
    followingLineNumber <= lineCount;
    followingLineNumber += 1
  ) {
    const followingItem = parseMarkdownOrderedListItem(
      getLineContent(followingLineNumber),
    )

    if (!followingItem) {
      break
    }

    if (followingItem.blockquotePrefix !== precedingItem.blockquotePrefix) {
      break
    }

    if (followingItem.indentation !== precedingItem.indentation) {
      if (followingItem.indentation.startsWith(precedingItem.indentation)) {
        continue
      }

      break
    }

    if (followingItem.delimiter !== precedingItem.delimiter) {
      break
    }

    renumberings.push({
      item: followingItem,
      lineNumber: followingLineNumber,
      numberText: nextNumberText,
    })
    nextNumberText = getNextOrderedListNumber(nextNumberText)
  }

  return renumberings
}
