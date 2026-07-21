import type { HeadingValue, ListValue } from '../markdownTypes'
import type { FencedCodeBlockContext } from './fencedCodeBlocks'

export function detectActiveHeadingValue(
  line: string,
  fencedCodeBlock: FencedCodeBlockContext,
): HeadingValue {
  if (fencedCodeBlock.insideCodeBlock) {
    return 'codeblock'
  }

  const headingMatch = line.match(/^\s{0,3}(#{1,6})\s/u)

  if (headingMatch) {
    return `h${headingMatch[1].length}` as HeadingValue
  }

  if (/^\s{0,3}>\s?/u.test(line)) {
    return 'blockquote'
  }

  if (/^\s{0,3}```/u.test(line)) {
    return 'codeblock'
  }

  return 'normal'
}

export function detectActiveListValue(line: string): ListValue {
  if (/^\s*[-+*]\s+\[[ xX]\](?:\s+|$)/u.test(line)) {
    return 'checklist'
  }

  if (/^\s*[-+*]\s+/u.test(line)) {
    return 'bullet'
  }

  if (/^\s*\d+[.)]\s+/u.test(line)) {
    return 'numbered'
  }

  return 'none'
}
