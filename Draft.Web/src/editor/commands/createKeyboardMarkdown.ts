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
  return `<kbd>${escapeHtmlText(keybind.trim() || 'Key')}</kbd>`
}
