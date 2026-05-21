import { draftDarkTokens, themeFontStacks } from '../shared/themeTokens'
import type { DraftPreviewTheme } from './previewThemeTypes'

type PreviewThemeVariables = DraftPreviewTheme['cssVariables']

// Color tokens: surfaces, text, accents, and line colors.
// Color values accept CSS colors: hex, rgb(), hsl(), transparent, or currentColor.
const gptPreviewColorVariables = {
  // Document
  '--preview-background': draftDarkTokens.chromeBackground,
  '--preview-foreground': '#fff',

  // Headings and rules
  '--preview-heading-foreground': '#fff',
  '--preview-rule-border': '#374151',

  // Links
  '--preview-link-background': 'transparent',
  '--preview-link-foreground': '#fff',
  '--preview-link-text-decoration-color': '#fff',
  '--preview-link-hover-background': 'transparent',
  '--preview-link-hover-foreground': '#339CFF',
  '--preview-link-hover-text-decoration-color': '#339CFF',

  // Inline code
  '--preview-inline-code-background': '#242424',
  '--preview-inline-code-border': 'transparent',
  '--preview-inline-code-foreground': '#f9fafb',

  // Task list checkboxes
  '--preview-task-list-checkbox-background': '#fff',
  '--preview-task-list-checkbox-border': '#6B6B6B',
  '--preview-task-list-checkbox-foreground': 'transparent',
  '--preview-task-list-checkbox-checked-background': '#004F99',
  '--preview-task-list-checkbox-checked-border': 'transparent',
  '--preview-task-list-checkbox-checked-foreground': '#fff',

  // Code blocks
  '--preview-code-block-background': '#242424',
  '--preview-code-block-border': 'transparent',
  '--preview-code-block-foreground': '#fff',

  // Blockquotes
  '--preview-blockquote-background': 'transparent',
  '--preview-blockquote-border': '#3A3A3A',
  '--preview-blockquote-foreground': '#fff',

  // Tables
  '--preview-table-border': 'transparent',
  '--preview-table-cell-background': 'transparent',
  '--preview-table-column-border': 'transparent',
  '--preview-table-header-background': 'transparent',
  '--preview-table-header-border': '#3F3F3F',
  '--preview-table-header-foreground': '#f9fafb',
  '--preview-table-outer-border': 'transparent',
  '--preview-table-row-border': '#202020',

  // Scrollbars
  '--preview-scrollbar-thumb': draftDarkTokens.scrollbarThumb,
  '--preview-scrollbar-track': 'transparent',
} satisfies PreviewThemeVariables

// Layout tokens: radii, border widths, spacing, and table grid behavior.
const gptPreviewLayoutVariables = {
  // Inline code
  // Border width 0 removes the border. Radius, padding, and border width accept CSS lengths.
  '--preview-inline-code-border-radius': '6px',
  '--preview-inline-code-border-width': '0',
  '--preview-inline-code-padding': '2px 6px',

  // Links
  // decoration-line: none | underline | overline | line-through
  // decoration-style: solid | double | dotted | dashed | wavy
  // decoration-thickness: auto | from-font | CSS length; underline-offset: auto | CSS length.
  '--preview-link-border-radius': '0',
  '--preview-link-hover-text-decoration-line': 'underline',
  '--preview-link-hover-text-decoration-style': 'solid',
  '--preview-link-hover-text-decoration-thickness': '1px',
  '--preview-link-text-decoration-line': 'underline',
  '--preview-link-text-decoration-style': 'dotted',
  '--preview-link-text-decoration-thickness': '1px',
  '--preview-link-text-underline-offset': '3px',

  // Task list checkboxes
  // Size, radius, border width, and checkmark dimensions accept CSS lengths.
  // disabled-opacity: 0..1; margin: CSS margin shorthand.
  // vertical-align: middle | baseline | text-top | text-bottom | CSS length.
  '--preview-task-list-checkbox-size': '16px',
  '--preview-task-list-checkbox-border-radius': '2px',
  '--preview-task-list-checkbox-border-width': '1px',
  '--preview-task-list-checkbox-checkmark-width': '10px',
  '--preview-task-list-checkbox-checkmark-height': '8px',
  '--preview-task-list-checkbox-disabled-opacity': '1',
  '--preview-task-list-checkbox-margin': '0 8px 0 -20px',
  '--preview-task-list-checkbox-vertical-align': 'middle',

  // Code blocks
  // Border width 0 removes the border. Radii and padding accept CSS lengths.
  '--preview-code-block-border-radius': '16px',
  '--preview-code-block-border-width': '0',
  '--preview-code-block-copy-button-border-radius': '6px',
  '--preview-code-block-padding': '14px',

  // Blockquotes
  // Border inset moves the marker inward; border width 0 hides it. All values accept CSS lengths.
  '--preview-blockquote-border-inset': '0',
  '--preview-blockquote-border-line-radius': '2px',
  '--preview-blockquote-border-radius': '0',
  '--preview-blockquote-border-width': '4px',
  '--preview-blockquote-padding': '8px 16px',

  // Tables
  // Border width 0 removes that line. Use row, column, header, and outer widths to shape the grid.
  '--preview-table-border-radius': '0',
  '--preview-table-cell-padding': '10px 12px',
  '--preview-table-column-border-width': '0',
  '--preview-table-header-border-width': '1px',
  '--preview-table-last-row-border-width': '0',
  '--preview-table-outer-border-width': '0',
  '--preview-table-row-border-width': '1px',
} satisfies PreviewThemeVariables

// Typography tokens: font stacks used inside rendered markdown.
const gptPreviewTypographyVariables = {
  // Code
  '--font-mono': themeFontStacks.mono,

  // Markdown body
  '--font-preview': themeFontStacks.preview,
} satisfies PreviewThemeVariables

export const gptPreviewTheme: DraftPreviewTheme = {
  cssVariables: {
    ...gptPreviewColorVariables,
    ...gptPreviewLayoutVariables,
    ...gptPreviewTypographyVariables,
  },
  id: 'gpt',
  label: 'GPT',
  // false: normal list numbers; true: bold list numbers.
  useBoldOrderedListMarkers: true,
  useRomanNestedOrderedLists: false,
}

export default gptPreviewTheme
