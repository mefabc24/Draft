export function toggleFencedCodeBlockText(selectedText: string) {
  const trimmedText = selectedText.trim()
  const isCodeBlock =
    trimmedText.startsWith('```') && trimmedText.endsWith('```')

  return isCodeBlock
    ? trimmedText.replace(/^```\s*\n?/u, '').replace(/\n?```\s*$/u, '')
    : `\`\`\`\n${selectedText}\n\`\`\``
}
