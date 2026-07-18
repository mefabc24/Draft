import assistantDarkPreviewTheme from './assistantDark.previewTheme'
import type { DraftPreviewTheme } from './support/previewThemeTypes'

type PreviewThemeVariables = DraftPreviewTheme['cssVariables']

// Assistant Light keeps the Assistant Dark layout and typography while
// replacing its dark palette with colors designed for a white document.
const assistantLightPreviewColorVariables = {
  // Document
  '--preview-background': '#FFFFFF',
  '--preview-foreground': '#000000',

  // Basic text formatting
  '--preview-bold-foreground': 'currentColor',
  '--preview-italic-foreground': 'currentColor',
  '--preview-strikethrough-foreground': 'currentColor',
  '--preview-strikethrough-text-decoration-color': 'currentColor',
  '--preview-underline-foreground': 'currentColor',
  '--preview-underline-text-decoration-color': 'currentColor',

  // Headings: text color
  '--preview-heading-foreground': '#000000',
  '--preview-h1-foreground': '#000000',
  '--preview-h2-foreground': '#000000',
  '--preview-h3-foreground': '#000000',
  '--preview-h4-foreground': '#000000',
  '--preview-h5-foreground': '#000000',
  '--preview-h6-foreground': '#000000',

  // Headings: background color
  '--preview-heading-background': 'transparent',
  '--preview-h1-background': 'transparent',
  '--preview-h2-background': 'transparent',
  '--preview-h3-background': 'transparent',
  '--preview-h4-background': 'transparent',
  '--preview-h5-background': 'transparent',
  '--preview-h6-background': 'transparent',

  // Headings: underline color
  '--preview-h1-line-color': 'transparent',
  '--preview-h2-line-color': 'transparent',
  '--preview-h3-line-color': 'transparent',
  '--preview-h4-line-color': 'transparent',
  '--preview-h5-line-color': 'transparent',
  '--preview-h6-line-color': 'transparent',

  // Horizontal rule
  '--preview-rule-border': '#D1D5DB',

  // Images
  '--preview-image-border': 'transparent',

  // Links
  '--preview-link-background': 'transparent',
  '--preview-link-foreground': '#000000',
  '--preview-link-text-decoration-color': '#000000',
  '--preview-link-hover-background': 'transparent',
  '--preview-link-hover-foreground': '#0067C0',
  '--preview-link-hover-text-decoration-color': '#0067C0',

  // Inline code
  '--preview-inline-code-background': '#F3F4F6',
  '--preview-inline-code-border': 'transparent',
  '--preview-inline-code-foreground': '#000000',

  // Keyboard keys
  '--preview-keyboard-key-background': '#F3F4F6',
  '--preview-keyboard-key-foreground': '#000000',
  '--preview-keyboard-key-border': '#B3B3B3',
  '--preview-keyboard-key-border-bottom': '#767676',

  // Draft inline extensions
  '--preview-highlight-background': 'rgba(0, 103, 192, 0.16)',
  '--preview-highlight-foreground': '#000000',
  '--preview-spoiler-background': '#1F1F1F',
  '--preview-spoiler-revealed-background': 'rgba(0, 0, 0, 0.06)',
  '--preview-spoiler-foreground': '#000000',
  '--preview-tag-default-color': '#0067C0',
  '--preview-tag-foreground': '#000000',
  '--preview-tag-background-opacity': '12%',

  // Task list checkboxes
  '--preview-task-list-checkbox-background': '#FFFFFF',
  '--preview-task-list-checkbox-border': '#767676',
  '--preview-task-list-checkbox-foreground': 'transparent',
  '--preview-task-list-checkbox-checked-background': '#0067C0',
  '--preview-task-list-checkbox-checked-border': 'transparent',
  '--preview-task-list-checkbox-checked-foreground': '#FFFFFF',

  // Code blocks
  '--preview-code-block-background': '#F3F4F6',
  '--preview-code-block-copy-button-background': '#F3F4F6',
  '--preview-code-block-border': 'transparent',
  '--preview-code-block-copy-icon-foreground': '#000000',
  '--preview-code-block-foreground': '#000000',
  '--preview-code-block-scrollbar-thumb': '#C1C1C1',
  '--preview-code-block-scrollbar-track': 'transparent',

  // Blockquote colors
  '--preview-blockquote-default-color': '#6B7280',
  '--preview-blockquote-note-color': '#2563EB',
  '--preview-blockquote-info-color': '#0067C0',
  '--preview-blockquote-tip-color': '#3F7D4B',
  '--preview-blockquote-important-color': '#9A4F3D',
  '--preview-blockquote-warning-color': '#946200',
  '--preview-blockquote-caution-color': '#C2410C',
  '--preview-blockquote-error-color': '#C42B1C',
  '--preview-blockquote-success-color': '#107C10',
  '--preview-blockquote-good-color': '#107C10',
  '--preview-blockquote-bad-color': '#C42B1C',
  '--preview-blockquote-pro-color': '#107C10',
  '--preview-blockquote-con-color': '#C42B1C',
  '--preview-blockquote-question-color': '#00758F',
  '--preview-blockquote-todo-color': '#5F5F5F',

  // Expanders
  '--preview-expander-background': '#FFFFFF',
  '--preview-expander-border': '#D1D5DB',
  '--preview-expander-summary-background': '#F3F4F6',
  '--preview-expander-summary-foreground': '#000000',
  '--preview-expander-summary-hover-background': '#E5E7EB',
  '--preview-expander-summary-hover-foreground': '#000000',
  '--preview-expander-marker-foreground': '#0067C0',
  '--preview-expander-content-background': '#FFFFFF',
  '--preview-expander-content-foreground': '#000000',
  '--preview-expander-divider': '#D1D5DB',
  '--preview-expander-focus-ring': '#0067C0',

  // Tables
  '--preview-table-border': 'transparent',
  '--preview-table-cell-background': 'transparent',
  '--preview-table-column-border': 'transparent',
  '--preview-table-header-background': 'transparent',
  '--preview-table-header-border': '#D1D5DB',
  '--preview-table-header-foreground': '#000000',
  '--preview-table-outer-border': 'transparent',
  '--preview-table-row-border': '#E5E7EB',

  // Scrollbars
  '--preview-scrollbar-thumb': '#C1C1C1',
  '--preview-scrollbar-track': 'transparent',
} satisfies PreviewThemeVariables

export const assistantLightPreviewTheme: DraftPreviewTheme = {
  ...assistantDarkPreviewTheme,
  cssVariables: {
    ...assistantDarkPreviewTheme.cssVariables,
    ...assistantLightPreviewColorVariables,
  },
  id: 'assistantLight',
  label: 'Assistant Light',
  prettyCodeTheme: 'light-plus',
}

export default assistantLightPreviewTheme
