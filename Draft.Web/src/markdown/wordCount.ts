function stripMarkdownSyntax(content: string) {
  return content
    .replace(/^\s{0,3}(?:`{3,}|~{3,}).*$/gm, ' ')
    .replace(/^\s{0,3}\[[^\]]+\]:\s+\S+.*$/gm, ' ')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s*/gm, ' ')
    .replace(/^\s{0,3}>\s?/gm, ' ')
    .replace(/^\s{0,3}(?:[-+*]|\d+[.)])\s+/gm, ' ')
    .replace(/^\s{0,3}(?:[-*_]\s*){3,}$/gm, ' ')
    .replace(/^\s{0,3}(?:=+|-+)\s*$/gm, ' ')
    .replace(/\[[ xX]\]\s+/g, ' ')
    .replace(/<[^>\r\n]+>/g, ' ')
    .replace(/[`*_~|]/g, ' ')
    .replace(/\\([\\`*_{}[\]()#+\-.!>])/g, '$1')
}

export function countMarkdownWords(content: string) {
  const words = stripMarkdownSyntax(content).match(
    /[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu,
  )
  return words ? words.length : 0
}
