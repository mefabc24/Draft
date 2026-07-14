export type AutoClosingWrapperPair = {
  close: string
  open: string
}

export const draftAutoClosingBracketPairs = [
  { open: '{', close: '}' },
  { open: '[', close: ']' },
  { open: '(', close: ')' },
] satisfies AutoClosingWrapperPair[]

export const draftAutoClosingQuotePairs = [
  { open: "'", close: "'" },
  { open: '"', close: '"' },
  { open: '`', close: '`' },
] satisfies AutoClosingWrapperPair[]

export const draftHtmlAnglePair = {
  open: '<',
  close: '>',
} satisfies AutoClosingWrapperPair
