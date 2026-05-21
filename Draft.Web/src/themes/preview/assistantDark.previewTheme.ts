import { draftDarkTokens } from '../shared/themeTokens'
import type { DraftPreviewTheme } from './previewThemeTypes'

type PreviewThemeVariables = DraftPreviewTheme['cssVariables']

// Color tokens: surfaces, text, accents, and line colors.
// Color values accept CSS colors: hex, rgb(), hsl(), transparent, or currentColor.
const assistantDarkPreviewColorVariables = {
  // Document
  '--preview-background': draftDarkTokens.chromeBackground,
  '--preview-foreground': '#fff',

  // Headings and rules
  '--preview-heading-foreground': '#fff',
  '--preview-h1-foreground': '#fff',
  '--preview-h1-line-color': 'red',
  '--preview-h2-foreground': '#fff',
  '--preview-h2-line-color': '#374151',
  '--preview-h3-foreground': '#fff',
  '--preview-h3-line-color': '#374151',
  '--preview-h4-foreground': '#fff',
  '--preview-h4-line-color': '#374151',
  '--preview-h5-foreground': '#fff',
  '--preview-h5-line-color': '#374151',
  '--preview-h6-foreground': '#fff',
  '--preview-h6-line-color': '#374151',
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
const assistantDarkPreviewLayoutVariables = {
  // Headings and rules
  // Heading line height 0 hides the line. Line spacing controls the gap between heading text and line.
  '--preview-h1-font-weight': '600',
  '--preview-h1-line-height': '1px',
  '--preview-h1-line-spacing': '0',
  '--preview-h2-font-weight': '600',
  '--preview-h2-line-height': '1px',
  '--preview-h2-line-spacing': '0',
  '--preview-h3-font-weight': '600',
  '--preview-h3-line-height': '0',
  '--preview-h3-line-spacing': '0',
  '--preview-h4-font-weight': '600',
  '--preview-h4-line-height': '0',
  '--preview-h4-line-spacing': '0',
  '--preview-h5-font-weight': '600',
  '--preview-h5-line-height': '0',
  '--preview-h5-line-spacing': '0',
  '--preview-h6-font-weight': '600',
  '--preview-h6-line-height': '0',
  '--preview-h6-line-spacing': '0',

  // Rule height controls how thick the line is. Height 0 hides it. Radius accepts CSS lengths.
  '--preview-rule-border-radius': '0',
  '--preview-rule-height': '1px',

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
  '--preview-link-hover-text-decoration-style': 'dotted',
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
const assistantDarkPreviewTypographyVariables = {
  // Code
  // CSS font-family stack used by inline code and code blocks.
  '--font-mono':
    "'Cascadia Code', 'Cascadia Mono', 'JetBrains Mono', Consolas, 'Courier New', monospace",

  // Markdown body
  // CSS font-family stack used by normal markdown text.
  '--font-preview': "'Segoe UI', Arial, sans-serif",
} satisfies PreviewThemeVariables

export const assistantDarkPreviewTheme: DraftPreviewTheme = {
  cssVariables: {
    ...assistantDarkPreviewColorVariables,
    ...assistantDarkPreviewLayoutVariables,
    ...assistantDarkPreviewTypographyVariables,
  },
  id: 'assistantDark',
  label: 'Assistant Dark',
  /**
   * true: table stretches to the full preview width.
   * false: table uses content width, capped at the preview width.
   */
  stretchTablesToFullWidth: true,
  /**
   * Ordered list markers by nesting depth: [level 0, level 1, level 2+].
   * The last entry repeats for deeper levels.
   * Shorthand: 'decimal' equals { numbering: 'decimal' }.
   * numbering: decimal | roman | upperRoman | alphabetical | upperAlphabetical | none | any CSS list-style-type.
   * color: hex | rgb() | hsl() | currentColor | any CSS color.
   * fontWeight: normal | bold | 100..900.
   * spacing: CSS length, e.g. 0, 4px, 0.35em.
   * size: CSS length, e.g. 1em, 0.9em, 14px.
   */
  orderedListMarkerStyles: [{ numbering: 'decimal', fontWeight: '700' }],
  /**
   * 0 disables looping. 1 repeats the whole ordered marker array once.
   */
  orderedListMarkerLoopCount: 0,

  /**
   * Unordered list markers by nesting depth: [level 0, level 1, level 2+].
   * The last entry repeats for deeper levels.
   * Shorthand: 'disc' equals { shape: 'disc' }.
   * shape: disc | circle | square | none | any CSS list-style-type.
   * color: hex | rgb() | hsl() | currentColor | any CSS color.
   * spacing: CSS length, e.g. 0, 4px, 0.35em.
   * size: CSS length, e.g. 1em, 0.9em, 14px.
   */
  unorderedListMarkerStyles: [{ shape: 'disc', size: '1.2em' }],
  /**
   * 0 disables looping. 1 repeats the whole unordered marker array once.
   */
  unorderedListMarkerLoopCount: 0,
}

export default assistantDarkPreviewTheme
