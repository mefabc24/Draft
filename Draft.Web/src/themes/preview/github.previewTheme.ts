import { draftDarkTokens, themeFontStacks } from '../shared/themeTokens'
import type { DraftPreviewTheme } from './previewThemeTypes'

type PreviewThemeVariables = DraftPreviewTheme['cssVariables']

// Color tokens: surfaces, text, accents, and line colors.
// Color values accept CSS colors: hex, rgb(), hsl(), transparent, or currentColor.
const githubPreviewColorVariables = {
  // Document
  '--preview-background': draftDarkTokens.chromeBackground,
  '--preview-foreground': '#d1d5db',

  // Headings and rules
  '--preview-heading-foreground': draftDarkTokens.accentBlue,
  '--preview-rule-border': '#374151',

  // Links
  '--preview-link-background': 'transparent',
  '--preview-link-foreground': '#60a5fa',
  '--preview-link-text-decoration-color': '#60a5fa',
  '--preview-link-hover-background': 'transparent',
  '--preview-link-hover-foreground': '#93c5fd',
  '--preview-link-hover-text-decoration-color': '#93c5fd',

  // Inline code
  '--preview-inline-code-background': '#1f2937',
  '--preview-inline-code-border': '#374151',
  '--preview-inline-code-foreground': '#f9fafb',

  // Task list checkboxes
  '--preview-task-list-checkbox-background': 'transparent',
  '--preview-task-list-checkbox-border': '#4b5563',
  '--preview-task-list-checkbox-foreground': 'transparent',
  '--preview-task-list-checkbox-checked-background': draftDarkTokens.accentGreen,
  '--preview-task-list-checkbox-checked-border': draftDarkTokens.accentGreen,
  '--preview-task-list-checkbox-checked-foreground': '#111827',

  // Code blocks
  '--preview-code-block-background': '#111827',
  '--preview-code-block-border': '#2f3545',
  '--preview-code-block-foreground': '#e5e7eb',

  // Blockquotes
  '--preview-blockquote-background': 'rgba(121, 169, 134, 0.08)',
  '--preview-blockquote-border': draftDarkTokens.accentGreen,
  '--preview-blockquote-foreground': '#cbd5e1',

  // Tables
  '--preview-table-border': '#374151',
  '--preview-table-cell-background': '#111827',
  '--preview-table-column-border': '#374151',
  '--preview-table-header-background': '#1f2937',
  '--preview-table-header-border': '#374151',
  '--preview-table-header-foreground': '#f9fafb',
  '--preview-table-outer-border': '#374151',
  '--preview-table-row-border': '#374151',

  // Scrollbars
  '--preview-scrollbar-thumb': draftDarkTokens.scrollbarThumb,
  '--preview-scrollbar-track': 'transparent',
} satisfies PreviewThemeVariables

// Layout tokens: radii, border widths, spacing, and table grid behavior.
const githubPreviewLayoutVariables = {
  // Inline code
  // Border width 0 removes the border. Radius, padding, and border width accept CSS lengths.
  '--preview-inline-code-border-radius': '6px',
  '--preview-inline-code-border-width': '1px',
  '--preview-inline-code-padding': '2px 6px',

  // Links
  // decoration-line: none | underline | overline | line-through
  // decoration-style: solid | double | dotted | dashed | wavy
  // decoration-thickness: auto | from-font | CSS length; underline-offset: auto | CSS length.
  '--preview-link-border-radius': '0',
  '--preview-link-hover-text-decoration-line': 'underline',
  '--preview-link-hover-text-decoration-style': 'solid',
  '--preview-link-hover-text-decoration-thickness': '1px',
  '--preview-link-text-decoration-line': 'none',
  '--preview-link-text-decoration-style': 'solid',
  '--preview-link-text-decoration-thickness': '1px',
  '--preview-link-text-underline-offset': '3px',

  // Task list checkboxes
  // Size, radius, border width, and checkmark dimensions accept CSS lengths.
  // disabled-opacity: 0..1; margin: CSS margin shorthand.
  // vertical-align: middle | baseline | text-top | text-bottom | CSS length.
  '--preview-task-list-checkbox-size': '16px',
  '--preview-task-list-checkbox-border-radius': '4px',
  '--preview-task-list-checkbox-border-width': '1px',
  '--preview-task-list-checkbox-checkmark-width': '8px',
  '--preview-task-list-checkbox-checkmark-height': '6px',
  '--preview-task-list-checkbox-disabled-opacity': '1',
  '--preview-task-list-checkbox-margin': '0 8px 0 -20px',
  '--preview-task-list-checkbox-vertical-align': 'middle',

  // Code blocks
  // Border width 0 removes the border. Radii and padding accept CSS lengths.
  '--preview-code-block-border-radius': '10px',
  '--preview-code-block-border-width': '1px',
  '--preview-code-block-copy-button-border-radius': '8px',
  '--preview-code-block-padding': '14px',

  // Blockquotes
  // Border inset moves the marker inward; border width 0 hides it. All values accept CSS lengths.
  '--preview-blockquote-border-inset': '0',
  '--preview-blockquote-border-line-radius': '0',
  '--preview-blockquote-border-radius': '0',
  '--preview-blockquote-border-width': '4px',
  '--preview-blockquote-padding': '8px 16px',

  // Tables
  // Border width 0 removes that line. Use row, column, header, and outer widths to shape the grid.
  '--preview-table-border-radius': '0',
  '--preview-table-cell-padding': '8px 12px',
  '--preview-table-column-border-width': '1px',
  '--preview-table-header-border-width': '1px',
  '--preview-table-last-row-border-width': '0',
  '--preview-table-outer-border-width': '1px',
  '--preview-table-row-border-width': '1px',
} satisfies PreviewThemeVariables

// Typography tokens: font stacks used inside rendered markdown.
const githubPreviewTypographyVariables = {
  // Code
  '--font-mono': themeFontStacks.mono,

  // Markdown body
  '--font-preview': themeFontStacks.preview,
} satisfies PreviewThemeVariables

export const githubPreviewTheme: DraftPreviewTheme = {
  cssVariables: {
    ...githubPreviewColorVariables,
    ...githubPreviewLayoutVariables,
    ...githubPreviewTypographyVariables,
  },
  id: 'github',
  label: 'GitHub',
  // false: normal list numbers; true: bold list numbers.
  useBoldOrderedListMarkers: true,
  useRomanNestedOrderedLists: false,
}

export default githubPreviewTheme
