export function removeListPrefix(line: string) {
  return line.replace(
    /^(\s*)(?:(?:[-+*])\s+\[[ xX]\]\s+|(?:[-+*])\s+|\d+[.)]\s+)/u,
    '$1',
  )
}

export function addListPrefix(line: string, prefix: string) {
  const normalizedLine = removeListPrefix(line)
  const match = normalizedLine.match(/^(\s*)(.*)$/u)
  const indentation = match?.[1] ?? ''
  const content = match?.[2] ?? normalizedLine

  return `${indentation}${prefix}${content}`
}
