import { draftDarkTokens } from '../shared/themeTokens'
import type { DraftPreviewTheme } from './support/previewThemeTypes'

type PreviewThemeVariables = DraftPreviewTheme['cssVariables']

// Color tokens: surfaces, text, accents, and line colors.
// Color values accept CSS colors: hex, rgb(), hsl(), transparent, or currentColor.
const theHubPreviewColorVariables = {
  // Document
  '--preview-background': draftDarkTokens.chromeBackground,
  '--preview-foreground': '#fff',

  // Headings: text color
  '--preview-heading-foreground': '#fff',
  '--preview-h1-foreground': '#000',
  '--preview-h2-foreground': draftDarkTokens.theHubAccent,
  '--preview-h3-foreground': draftDarkTokens.theHubAccent,
  '--preview-h4-foreground': '#fff',
  '--preview-h5-foreground': '#fff',
  '--preview-h6-foreground': '#fff',

  // Headings: background color
  // Use transparent to disable the background. Values accept any CSS color.
  '--preview-heading-background': 'transparent',
  '--preview-h1-background': draftDarkTokens.theHubAccent,
  '--preview-h2-background': 'transparent',
  '--preview-h3-background': 'transparent',
  '--preview-h4-background': 'transparent',
  '--preview-h5-background': 'transparent',
  '--preview-h6-background': 'transparent',

  // Headings: underline color
  '--preview-h1-line-color': '#374151',
  '--preview-h2-line-color': '#374151',
  '--preview-h3-line-color': '#374151',
  '--preview-h4-line-color': '#374151',
  '--preview-h5-line-color': '#374151',
  '--preview-h6-line-color': '#374151',

  // Horizontal rule
  '--preview-rule-border': draftDarkTokens.theHubAccent,

  // Images
  '--preview-image-border': 'transparent',

  // Links
  '--preview-link-background': 'transparent',
  '--preview-link-foreground': draftDarkTokens.theHubAccent,
  '--preview-link-text-decoration-color': draftDarkTokens.theHubAccent,
  '--preview-link-hover-background': 'transparent',
  '--preview-link-hover-foreground': draftDarkTokens.theHubAccent,
  '--preview-link-hover-text-decoration-color': draftDarkTokens.theHubAccent,

  // Inline code
  '--preview-inline-code-background': draftDarkTokens.theHubAccent,
  '--preview-inline-code-border': 'transparent',
  '--preview-inline-code-foreground': '#000',

  // Task list checkboxes
  '--preview-task-list-checkbox-background': '#000',
  '--preview-task-list-checkbox-border': draftDarkTokens.theHubAccent,
  '--preview-task-list-checkbox-foreground': 'transparent',
  '--preview-task-list-checkbox-checked-background': draftDarkTokens.theHubAccent,
  '--preview-task-list-checkbox-checked-border': 'transparent',
  '--preview-task-list-checkbox-checked-foreground': '#000',

  // Code blocks
  // copy-icon-foreground controls only the copy symbol fill color.
  '--preview-code-block-background': draftDarkTokens.theHubAccent,
  '--preview-code-block-border': 'transparent',
  '--preview-code-block-copy-icon-foreground': '#000',
  '--preview-code-block-foreground': '#000',

  // Blockquotes
  '--preview-blockquote-background': 'rgba(247, 152, 23, 10%)',
  '--preview-blockquote-border': draftDarkTokens.theHubAccent,
  '--preview-blockquote-foreground': '#fff',

  // Tables
  '--preview-table-border': 'blue',
  '--preview-table-cell-background': 'transparent',
  '--preview-table-column-border': 'transparent',
  '--preview-table-header-background': draftDarkTokens.theHubAccent,
  '--preview-table-header-border': draftDarkTokens.theHubAccent,
  '--preview-table-header-foreground': '#000',
  '--preview-table-outer-border': draftDarkTokens.theHubAccent,
  '--preview-table-row-border': 'rgba(247, 152, 23, 30%)',

  // Scrollbars
  '--preview-scrollbar-thumb': draftDarkTokens.scrollbarThumb,
  '--preview-scrollbar-track': 'transparent',
} satisfies PreviewThemeVariables

// Layout tokens: radii, border widths, spacing, and table grid behavior.
const theHubPreviewLayoutVariables = {
  // Headings: text weight
  // font-weight: normal | bold | 100..900.
  '--preview-h1-font-weight': '600',
  '--preview-h2-font-weight': '600',
  '--preview-h3-font-weight': '600',
  '--preview-h4-font-weight': '600',
  '--preview-h5-font-weight': '600',
  '--preview-h6-font-weight': '600',

  // Headings: background shape
  // padding: CSS padding shorthand, e.g. 0, 4px 8px, 8px 12px 10px.
  // border-radius: CSS length or radius shorthand, e.g. 0, 6px, 8px 8px 0 0.
  // background-width: auto stretches the background; fit-content wraps text and padding.
  '--preview-heading-background-width': 'auto',
  '--preview-heading-padding': '0',
  '--preview-heading-border-radius': '0',
  '--preview-h1-background-width': 'fit-content',
  '--preview-h1-padding': '0 12px',
  '--preview-h1-border-radius': '8px',
  '--preview-h2-background-width': 'auto',
  '--preview-h2-padding': '0',
  '--preview-h2-border-radius': '0',
  '--preview-h3-background-width': 'auto',
  '--preview-h3-padding': '0',
  '--preview-h3-border-radius': '0',
  '--preview-h4-background-width': 'auto',
  '--preview-h4-padding': '0',
  '--preview-h4-border-radius': '0',
  '--preview-h5-background-width': 'auto',
  '--preview-h5-padding': '0',
  '--preview-h5-border-radius': '0',
  '--preview-h6-background-width': 'auto',
  '--preview-h6-padding': '0',
  '--preview-h6-border-radius': '0',

  // Headings: underline
  // line-height 0 hides the line. line-spacing controls the gap between text and line.
  // line-radius accepts CSS lengths and radius shorthand.
  '--preview-h1-line-height': '0',
  '--preview-h1-line-spacing': '0',
  '--preview-h1-line-radius': '0',
  '--preview-h2-line-height': '0',
  '--preview-h2-line-spacing': '0',
  '--preview-h2-line-radius': '0',
  '--preview-h3-line-height': '0',
  '--preview-h3-line-spacing': '0',
  '--preview-h3-line-radius': '0',
  '--preview-h4-line-height': '0',
  '--preview-h4-line-spacing': '0',
  '--preview-h4-line-radius': '0',
  '--preview-h5-line-height': '0',
  '--preview-h5-line-spacing': '0',
  '--preview-h5-line-radius': '0',
  '--preview-h6-line-height': '0',
  '--preview-h6-line-spacing': '0',
  '--preview-h6-line-radius': '0',

  // Rule height controls how thick the line is. Height 0 hides it. Radius accepts CSS lengths.
  '--preview-rule-border-radius': '0',
  '--preview-rule-height': '1px',

  // Images
  // Border width 0 removes the border. Radius and border width accept CSS lengths.
  '--preview-image-border-radius': '8px',
  '--preview-image-border-width': '0',

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
  '--preview-link-text-decoration-line': 'none',
  '--preview-link-text-decoration-style': 'dotted',
  '--preview-link-text-decoration-thickness': '1px',
  '--preview-link-text-underline-offset': '3px',

  // Task list checkboxes
  // Size, radius, border width, and checkmark dimensions accept CSS lengths.
  // disabled-opacity: 0..1; margin: CSS margin shorthand.
  // vertical-align: middle | baseline | text-top | text-bottom | CSS length.
  '--preview-task-list-checkbox-size': '18px',
  '--preview-task-list-checkbox-border-radius': '4px',
  '--preview-task-list-checkbox-border-width': '2px',
  '--preview-task-list-checkbox-checkmark-width': '10px',
  '--preview-task-list-checkbox-checkmark-height': '8px',
  '--preview-task-list-checkbox-disabled-opacity': '1',
  '--preview-task-list-checkbox-margin': '-4px 8px 0 -20px',
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
  '--preview-blockquote-border-radius': '0 8px 8px 0',
  '--preview-blockquote-border-width': '4px',
  '--preview-blockquote-padding': '8px 16px',

  // Tables
  // Border width 0 removes that line. Use row, column, header, and outer widths to shape the grid.
  '--preview-table-border-radius': '8px',
  '--preview-table-cell-padding': '10px 12px',
  '--preview-table-column-border-width': '0px',
  '--preview-table-header-border-width': '2px',
  '--preview-table-last-row-border-width': '2px',
  '--preview-table-outer-border-width': '2px',
  '--preview-table-row-border-width': '1px',
} satisfies PreviewThemeVariables

// Typography tokens: font stacks used inside rendered markdown.
const theHubPreviewTypographyVariables = {
  // Code
  // CSS font-family stack used by inline code and code blocks.
  '--font-mono':
    "'Cascadia Code', 'Cascadia Mono', 'JetBrains Mono', Consolas, 'Courier New', monospace",

  // Markdown body
  // CSS font-family stack used by normal markdown text.
  '--font-preview': "'Segoe UI', Arial, sans-serif",
} satisfies PreviewThemeVariables

export const theHubPreviewTheme: DraftPreviewTheme = {
  cssVariables: {
    ...theHubPreviewColorVariables,
    ...theHubPreviewLayoutVariables,
    ...theHubPreviewTypographyVariables,
  },
  id: 'theHub',
  label: 'The Hub',
  /**
   * true: fenced code blocks receive Shiki token colors.
   * false: code blocks use the plain theme foreground color.
   */
  usePrettyCode: false,
  /**
   * Shiki theme used by rehype-pretty-code when usePrettyCode is true.
   */
  prettyCodeTheme: 'dark-plus',
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
  orderedListMarkerStyles: [{ numbering: 'decimal', fontWeight: '700',  color: draftDarkTokens.theHubAccent }],
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
  unorderedListMarkerStyles: [{ shape: 'disc', size: '1.2em', color: draftDarkTokens.theHubAccent }],
  /**
   * 0 disables looping. 1 repeats the whole unordered marker array once.
   */
  unorderedListMarkerLoopCount: 0,
}

export default theHubPreviewTheme
