export type CreateCodeBlockMarkdownData = {
  language: string
}

export function createCodeBlockMarkdown({
  language,
}: CreateCodeBlockMarkdownData) {
  return `\`\`\`${language.trim()}\n\n\`\`\``
}
