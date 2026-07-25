import draftDarkPreviewTheme from './draftDark.previewTheme'
import type { DraftPreviewTheme } from './support/previewThemeTypes'

type PreviewThemeVariables = DraftPreviewTheme['cssVariables']

// Draft Light preserves Draft Dark's layout and typography while replacing
// every color variable with a palette designed for a white document.
const draftLightPreviewColorVariables = {
  // Document
  '--preview-background': '#FFFFFF',
  '--preview-foreground': '#374151',

  // Basic text formatting
  '--preview-bold-foreground': 'currentColor',
  '--preview-italic-foreground': 'currentColor',
  '--preview-strikethrough-foreground': 'currentColor',
  '--preview-strikethrough-text-decoration-color': 'currentColor',
  '--preview-underline-foreground': 'currentColor',
  '--preview-underline-text-decoration-color': 'currentColor',

  // Headings: text color
  '--preview-heading-foreground': '#2F6FC4',
  '--preview-h1-foreground': '#2F6FC4',
  '--preview-h2-foreground': '#2F6FC4',
  '--preview-h3-foreground': '#2F6FC4',
  '--preview-h4-foreground': '#2F6FC4',
  '--preview-h5-foreground': '#2F6FC4',
  '--preview-h6-foreground': '#2F6FC4',

  // Headings: background color
  '--preview-heading-background': 'transparent',
  '--preview-h1-background': 'transparent',
  '--preview-h2-background': 'transparent',
  '--preview-h3-background': 'transparent',
  '--preview-h4-background': 'transparent',
  '--preview-h5-background': 'transparent',
  '--preview-h6-background': 'transparent',

  // Headings: underline color
  '--preview-h1-line-color': '#D1D5DB',
  '--preview-h2-line-color': '#D1D5DB',
  '--preview-h3-line-color': '#D1D5DB',
  '--preview-h4-line-color': '#D1D5DB',
  '--preview-h5-line-color': '#D1D5DB',
  '--preview-h6-line-color': '#D1D5DB',

  // Horizontal rule
  '--preview-rule-border': '#D1D5DB',

  // Images
  '--preview-image-border': 'transparent',

  // Links
  '--preview-link-background': 'transparent',
  '--preview-link-foreground': '#2F6FC4',
  '--preview-link-text-decoration-color': '#2F6FC4',
  '--preview-link-hover-background': 'transparent',
  '--preview-link-hover-foreground': '#18437D',
  '--preview-link-hover-text-decoration-color': '#18437D',

  // Inline code
  '--preview-inline-code-background': '#F3F4F6',
  '--preview-inline-code-border': 'transparent',
  '--preview-inline-code-foreground': '#1F2937',

  // Keyboard keys
  '--preview-keyboard-key-background': '#F3F4F6',
  '--preview-keyboard-key-foreground': '#1F2937',
  '--preview-keyboard-key-border': '#D1D5DB',
  '--preview-keyboard-key-border-bottom': '#9CA3AF',

  // Draft inline extensions
  '--preview-highlight-background': 'rgba(255, 208, 132, 0.42)',
  '--preview-highlight-foreground': '#1F2937',
  '--preview-spoiler-background': '#1F2937',
  '--preview-spoiler-revealed-background': 'rgba(47, 111, 196, 0.10)',
  '--preview-spoiler-foreground': '#1F2937',
  '--preview-tag-default-color': '#2F6FC4',
  '--preview-tag-text-decoration-color': 'currentColor',
  '--preview-tag-background-opacity': '12%',

  // Task list checkboxes
  '--preview-task-list-checkbox-background': '#FFFFFF',
  '--preview-task-list-checkbox-border': '#6B7280',
  '--preview-task-list-checkbox-foreground': 'transparent',
  '--preview-task-list-checkbox-checked-background': '#208647',
  '--preview-task-list-checkbox-checked-border': '#208647',
  '--preview-task-list-checkbox-checked-foreground': '#FFFFFF',

  // Code blocks
  '--preview-code-block-background': '#F3F4F6',
  '--preview-code-block-copy-button-background': '#F3F4F6',
  '--preview-code-block-border': '#D1D5DB',
  '--preview-code-block-copy-icon-foreground': '#374151',
  '--preview-code-block-foreground': '#1F2937',
  '--preview-code-block-scrollbar-thumb': '#BABABA',
  '--preview-code-block-scrollbar-track': 'transparent',

  // Blockquote colors
  '--preview-blockquote-default-color': '#4B5563',
  '--preview-blockquote-note-color': '#2F6FC4',
  '--preview-blockquote-info-color': '#2F6FC4',
  '--preview-blockquote-tip-color': '#208647',
  '--preview-blockquote-important-color': '#9A4F3D',
  '--preview-blockquote-warning-color': '#A96800',
  '--preview-blockquote-caution-color': '#C2410C',
  '--preview-blockquote-error-color': '#D83B42',
  '--preview-blockquote-success-color': '#208647',
  '--preview-blockquote-good-color': '#208647',
  '--preview-blockquote-bad-color': '#D83B42',
  '--preview-blockquote-pro-color': '#208647',
  '--preview-blockquote-con-color': '#D83B42',
  '--preview-blockquote-question-color': '#00758F',
  '--preview-blockquote-todo-color': '#535455',
  '--preview-blockquote-background-opacity': '0.08',
  '--preview-blockquote-bold-uses-callout-color': 'true',

  // Expanders
  '--preview-expander-background': '#FFFFFF',
  '--preview-expander-border': '#D1D5DB',
  '--preview-expander-summary-background': '#F3F4F6',
  '--preview-expander-summary-foreground': '#1F2937',
  '--preview-expander-summary-hover-background': '#E9EAEE',
  '--preview-expander-summary-hover-foreground': '#1F2937',
  '--preview-expander-marker-foreground': '#2F6FC4',
  '--preview-expander-content-background': '#FFFFFF',
  '--preview-expander-content-foreground': '#374151',
  '--preview-expander-divider': '#D1D5DB',
  '--preview-expander-focus-ring': '#2F6FC4',

  // Tables
  '--preview-table-border': '#D1D5DB',
  '--preview-table-cell-background': '#FFFFFF',
  '--preview-table-column-border': '#D1D5DB',
  '--preview-table-header-background': '#F3F4F6',
  '--preview-table-header-border': '#D1D5DB',
  '--preview-table-header-foreground': '#1F2937',
  '--preview-table-outer-border': '#D1D5DB',
  '--preview-table-row-border': '#D1D5DB',

  // Scrollbars
  '--preview-scrollbar-thumb': '#BABABA',
  '--preview-scrollbar-track': 'transparent',
} satisfies PreviewThemeVariables

export const draftLightPreviewTheme: DraftPreviewTheme = {
  ...draftDarkPreviewTheme,
  colorScheme: 'light',
  cssVariables: {
    ...draftDarkPreviewTheme.cssVariables,
    ...draftLightPreviewColorVariables,
  },
  familyId: 'draft',
  id: 'draftLight',
  label: 'Draft Light',
  prettyCodeTheme: 'light-plus',
}

export default draftLightPreviewTheme
