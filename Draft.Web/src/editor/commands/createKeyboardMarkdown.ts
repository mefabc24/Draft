export type CreateKeyboardMarkdownData = {
  keybind: string
}

function escapeHtmlText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function createKeyboardMarkdown({ keybind }: CreateKeyboardMarkdownData) {
  const keys = (keybind.trim() || 'Key')
    .split('+')
    .map((key) => key.trim())
    .filter(Boolean)

  return keys
    .map((key) => `<kbd>${escapeHtmlText(key)}</kbd>`)
    .join('+')
}
