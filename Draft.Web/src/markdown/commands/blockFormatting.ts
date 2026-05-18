export function removeHeadingPrefix(line: string) {
  return line.replace(/^(\s{0,3})#{1,6}\s*/u, '$1')
}

export function removeBlockquotePrefix(line: string) {
  return line.replace(/^(\s{0,3})>\s?/u, '$1')
}

export function addHeadingPrefix(line: string, level: number) {
  const normalizedLine = removeHeadingPrefix(line)
  const match = normalizedLine.match(/^(\s{0,3})(.*)$/u)
  const indentation = match?.[1] ?? ''
  const content = match?.[2] ?? normalizedLine

  return `${indentation}${'#'.repeat(level)} ${content}`
}

export function addBlockquotePrefix(line: string) {
  const normalizedLine = removeBlockquotePrefix(line)
  const match = normalizedLine.match(/^(\s*)(.*)$/u)
  const indentation = match?.[1] ?? ''
  const content = match?.[2] ?? normalizedLine

  return `${indentation}> ${content}`
}
