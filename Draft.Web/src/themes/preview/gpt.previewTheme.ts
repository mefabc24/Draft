import { draftDarkTokens, themeFontStacks } from '../shared/themeTokens'
import type { DraftPreviewTheme } from './previewThemeTypes'

export const gptPreviewTheme: DraftPreviewTheme = {
  cssVariables: {
    '--preview-background': draftDarkTokens.chromeBackground,
    '--preview-blockquote-background': 'rgba(121, 169, 134, 0.08)',
    '--preview-blockquote-border': draftDarkTokens.accentGreen,
    '--preview-blockquote-foreground': 'red', // cbd5e1
    '--preview-code-block-background': '#111827',
    '--preview-code-block-border': '#2f3545',
    '--preview-code-block-foreground': '#e5e7eb',
    '--preview-foreground': '#d1d5db',
    '--preview-heading-foreground': draftDarkTokens.accentBlue,
    '--preview-inline-code-background': '#1f2937',
    '--preview-inline-code-border': '#374151',
    '--preview-inline-code-foreground': '#f9fafb',
    '--preview-link-foreground': '#60a5fa',
    '--preview-rule-border': '#374151',
    '--preview-scrollbar-thumb': draftDarkTokens.scrollbarThumb,
    '--preview-scrollbar-track': 'transparent',
    '--preview-table-border': '#374151',
    '--preview-table-cell-background': '#111827',
    '--preview-table-header-background': '#1f2937',
    '--preview-table-header-foreground': '#f9fafb',
    '--font-mono': themeFontStacks.mono,
    '--font-preview': themeFontStacks.preview,
  },
  id: 'gpt',
  label: 'GPT',
}

export default gptPreviewTheme
