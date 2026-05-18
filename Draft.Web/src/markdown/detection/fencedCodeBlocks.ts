export type FencedCodeBlockContext =
  | {
      insideCodeBlock: false
    }
  | {
      insideCodeBlock: true
      isMarkdownCodeBlock: boolean
      language: string
    }

const MARKDOWN_FENCE_LANGUAGES = new Set(['md', 'markdown', 'mdown', 'mkd'])

export function getFencedCodeBlockContextFromLines(
  getLineContent: (lineNumber: number) => string,
  lineNumber: number,
): FencedCodeBlockContext {
  let insideCodeBlock = false
  let fenceCharacter = ''
  let fenceLength = 0
  let language = ''

  for (let index = 1; index <= lineNumber; index += 1) {
    const line = getLineContent(index)
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})\s*([^\s`]*)?.*$/u)

    if (!fenceMatch) {
      continue
    }

    const fence = fenceMatch[1]
    const nextFenceCharacter = fence[0]

    if (!insideCodeBlock) {
      insideCodeBlock = true
      fenceCharacter = nextFenceCharacter
      fenceLength = fence.length
      language = (fenceMatch[2] ?? '').toLowerCase()
      continue
    }

    if (
      nextFenceCharacter === fenceCharacter &&
      fence.length >= fenceLength
    ) {
      insideCodeBlock = false
      fenceCharacter = ''
      fenceLength = 0
      language = ''
    }
  }

  if (!insideCodeBlock) {
    return { insideCodeBlock: false }
  }

  return {
    insideCodeBlock: true,
    isMarkdownCodeBlock: MARKDOWN_FENCE_LANGUAGES.has(language),
    language,
  }
}
