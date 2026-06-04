const emptyHeadingSlug = 'heading'
const apostropheLikePattern = /['`\u00b4\u2018\u2019]/gu
const combiningMarkPattern = /\p{M}/gu
const nonSlugTextPattern = /[^\p{L}\p{N}]+/gu
const repeatedHyphenPattern = /-{2,}/gu
const edgeHyphenPattern = /^-|-$/gu

export function createHeadingSlug(text: string) {
  const slug = text
    .normalize('NFKD')
    .replace(combiningMarkPattern, '')
    .trim()
    .toLowerCase()
    .replace(apostropheLikePattern, '')
    .replace(nonSlugTextPattern, '-')
    .replace(repeatedHyphenPattern, '-')
    .replace(edgeHyphenPattern, '')

  return slug || emptyHeadingSlug
}

export function createUniqueHeadingId(text: string, usedIds: Set<string>) {
  const baseId = createHeadingSlug(text)
  let id = baseId
  let duplicateIndex = 0

  while (usedIds.has(id)) {
    duplicateIndex += 1
    id = `${baseId}-${duplicateIndex}`
  }

  usedIds.add(id)

  return id
}
