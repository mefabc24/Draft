import { draftDarkTokens } from '../shared/themeTokens'
import type { DraftPreviewTheme } from './support/previewThemeTypes'

type PreviewThemeVariables = DraftPreviewTheme['cssVariables']

// Color tokens: surfaces, text, accents, and line colors.
// Color values accept CSS colors: hex, rgb(), hsl(), transparent, or currentColor.
const repositoryDarkPreviewColorVariables = {
  // Document
  '--preview-background': draftDarkTokens.chromeBackground,
  '--preview-foreground': '#fff',

  // Basic text formatting
  '--preview-bold-foreground': 'currentColor',
  '--preview-italic-foreground': 'currentColor',
  '--preview-strikethrough-foreground': 'currentColor',
  '--preview-strikethrough-text-decoration-color': 'currentColor',
  '--preview-underline-foreground': 'currentColor',
  '--preview-underline-text-decoration-color': 'currentColor',

  // Headings: text color
  '--preview-heading-foreground': '#fff',
  '--preview-h1-foreground': '#fff',
  '--preview-h2-foreground': '#fff',
  '--preview-h3-foreground': '#fff',
  '--preview-h4-foreground': '#fff',
  '--preview-h5-foreground': '#fff',
  '--preview-h6-foreground': '#aaa',

  // Headings: background color
  // Use transparent to disable the background. Values accept any CSS color.
  '--preview-heading-background': 'transparent',
  '--preview-h1-background': 'transparent',
  '--preview-h2-background': 'transparent',
  '--preview-h3-background': 'transparent',
  '--preview-h4-background': 'transparent',
  '--preview-h5-background': 'transparent',
  '--preview-h6-background': 'transparent',

  // Headings: underline color
  '--preview-h1-line-color': '#3D444D',
  '--preview-h2-line-color': '#3D444D',
  '--preview-h3-line-color': '#3D444D',
  '--preview-h4-line-color': '#3D444D',
  '--preview-h5-line-color': '#3D444D',
  '--preview-h6-line-color': '#3D444D',

  // Horizontal rule
  '--preview-rule-border': '#3D444D',

  // Images
  '--preview-image-border': 'transparent',

  // Links
  '--preview-link-background': 'transparent',
  '--preview-link-foreground': '#3D93F8',
  '--preview-link-text-decoration-color': '#3D93F8',
  '--preview-link-hover-background': 'transparent',
  '--preview-link-hover-foreground': '#3D93F8',
  '--preview-link-hover-text-decoration-color': '#3D93F8',

  // Inline code
  '--preview-inline-code-background': '#242424',
  '--preview-inline-code-border': 'transparent',
  '--preview-inline-code-foreground': '#f9fafb',

  // Keyboard keys
  '--preview-keyboard-key-background': '#161b22',
  '--preview-keyboard-key-foreground': '#f9fafb',
  '--preview-keyboard-key-border': '#3D444D',
  '--preview-keyboard-key-border-bottom': '#8F8F9D',

  // Draft inline extensions
  '--preview-highlight-background': 'rgba(255, 230, 50, 0.4)',
  '--preview-highlight-foreground': '#fff',
  '--preview-spoiler-background': '#050505',
  '--preview-spoiler-revealed-background': 'rgb(208 208 208 / 0.12)',
  '--preview-spoiler-foreground': '#fff',
  '--preview-tag-default-color': '#3D93F8',
  '--preview-tag-foreground': '#fff',
  '--preview-tag-background-opacity': '18%',

  // Task list checkboxes
  '--preview-task-list-checkbox-background': '#222128',
  '--preview-task-list-checkbox-border': '#8F8F9D',
  '--preview-task-list-checkbox-foreground': 'transparent',
  '--preview-task-list-checkbox-checked-background': '#8F8F9D',
  '--preview-task-list-checkbox-checked-border': 'transparent',
  '--preview-task-list-checkbox-checked-foreground': '#fff',

  // Code blocks
  // copy-icon-foreground controls only the copy symbol fill color.
  '--preview-code-block-background': '#242424',
  '--preview-code-block-copy-button-background': '#242424',
  '--preview-code-block-border': 'transparent',
  '--preview-code-block-copy-icon-foreground': '#fff',
  '--preview-code-block-foreground': '#fff',
  '--preview-code-block-scrollbar-thumb': draftDarkTokens.scrollbarThumb,
  '--preview-code-block-scrollbar-track': 'transparent',

  // Blockquote colors
  '--preview-blockquote-default-color': '#3D444D',
  '--preview-blockquote-note-color': '#A5C8FF',
  '--preview-blockquote-info-color': '#3D93F8',
  '--preview-blockquote-tip-color': '#79A986',
  '--preview-blockquote-important-color': '#BD7561',
  '--preview-blockquote-warning-color': '#D9A441',
  '--preview-blockquote-caution-color': '#F97316',
  '--preview-blockquote-error-color': '#E25E5E',
  '--preview-blockquote-success-color': '#31C559',
  '--preview-blockquote-good-color': '#31C559',
  '--preview-blockquote-bad-color': '#E25E5E',
  '--preview-blockquote-pro-color': '#31C559',
  '--preview-blockquote-con-color': '#E25E5E',
  '--preview-blockquote-question-color': '#8AE9F8',
  '--preview-blockquote-todo-color': '#ACABAA',
  // Decimal alpha used to tint the blockquote color. 0 disables the background.
  '--preview-blockquote-background-opacity': '0',
  // true colors bold callout text with the callout color. false keeps normal text color.
  '--preview-blockquote-bold-uses-callout-color': 'true',

  // Expanders
  '--preview-expander-background': 'transparent',
  '--preview-expander-border': 'transparent',
  '--preview-expander-summary-background': 'transparent',
  '--preview-expander-summary-foreground': '#fff',
  '--preview-expander-summary-hover-background': '#242424',
  '--preview-expander-summary-hover-foreground': '#fff',
  '--preview-expander-marker-foreground': '#fff',
  '--preview-expander-content-background': 'transparent',
  '--preview-expander-content-foreground': '#fff',
  '--preview-expander-divider': '#3D444D',
  '--preview-expander-focus-ring': '#3D93F8',

  // Tables
  '--preview-table-border': 'transparent',
  '--preview-table-cell-background': 'transparent',
  '--preview-table-column-border': '#3D444D',
  '--preview-table-header-background': '#1C1C1C',
  '--preview-table-header-border': '#3D444D',
  '--preview-table-header-foreground': '#f9fafb',
  '--preview-table-outer-border': '#3D444D',
  '--preview-table-row-border': '#3D444D',

  // Scrollbars
  '--preview-scrollbar-thumb': draftDarkTokens.scrollbarThumb,
  '--preview-scrollbar-track': 'transparent',
} satisfies PreviewThemeVariables

// Layout tokens: radii, border widths, spacing, and table grid behavior.
const repositoryDarkPreviewLayoutVariables = {
  // Basic text formatting
  // Font size and letter spacing accept CSS lengths. Line height accepts a unitless number or CSS length.
  '--preview-font-size': '1rem',
  '--preview-font-weight': '400',
  '--preview-line-height': '1.7',
  '--preview-letter-spacing': 'normal',
  // Bold font weight: normal | bold | 100..900. Italic style: normal | italic | oblique.
  '--preview-bold-font-weight': '630',
  '--preview-italic-font-style': 'italic',
  // Strikethrough line: none | line-through. Style: solid | double | dotted | dashed | wavy.
  // Thickness: auto | from-font | CSS length such as 1px or 0.12em.
  '--preview-strikethrough-text-decoration-line': 'line-through',
  '--preview-strikethrough-text-decoration-style': 'solid',
  '--preview-strikethrough-text-decoration-thickness': '1px',
  // Underline line: none | underline. Style: solid | double | dotted | dashed | wavy.
  // Thickness and offset accept auto or a CSS length. Skip ink: auto | none.
  '--preview-underline-text-decoration-line': 'underline',
  '--preview-underline-text-decoration-style': 'solid',
  '--preview-underline-text-decoration-thickness': '1px',
  '--preview-underline-text-underline-offset': '2px',
  '--preview-underline-text-decoration-skip-ink': 'auto',

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
  '--preview-h1-background-width': 'auto',
  '--preview-h1-padding': '0',
  '--preview-h1-border-radius': '0',
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
  '--preview-h1-line-height': '1px',
  '--preview-h1-line-spacing': '0',
  '--preview-h1-line-radius': '0',
  '--preview-h2-line-height': '1px',
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
  '--preview-rule-height': '4px',

  // Images
  // Border width 0 removes the border. Radius and border width accept CSS lengths.
  '--preview-image-border-radius': '8px',
  '--preview-image-border-width': '0',

  // Inline code
  // Border width 0 removes the border. Radius, padding, and border width accept CSS lengths.
  '--preview-inline-code-border-radius': '6px',
  '--preview-inline-code-border-width': '0',
  '--preview-inline-code-padding': '2px 6px',

  // Keyboard keys
  // Border width 0 removes the border. Radius, spacing, and dimensions accept CSS lengths.
  '--preview-keyboard-key-border-radius': '5px',
  '--preview-keyboard-key-border-width': '1px',
  '--preview-keyboard-key-border-bottom-width': '1px',
  '--preview-keyboard-key-min-width': '1.65em',
  '--preview-keyboard-key-padding': '1px 6px 2px',
  '--preview-keyboard-key-margin': '0 0.08em',
  '--preview-keyboard-key-line-height': '1.25',
  '--preview-keyboard-key-vertical-align': '0.08em',

  // Draft inline extensions
  // Padding inline/block controls how far the highlight or pill extends beyond text.
  '--preview-highlight-border-radius': '0',
  '--preview-highlight-padding-inline': '6px',
  '--preview-highlight-padding-block': '1px',
  '--preview-spoiler-border-radius': '4px',
  '--preview-spoiler-padding-inline': '6px',
  '--preview-spoiler-padding-block': '2px',
  '--preview-tag-border-radius': '999px',
  '--preview-tag-border-width': '1px',
  '--preview-tag-padding-inline': '8px',
  '--preview-tag-padding-block': '2px',

  // Links
  // decoration-line: none | underline | overline | line-through
  // decoration-style: solid | double | dotted | dashed | wavy
  // decoration-thickness: auto | from-font | CSS length; underline-offset: auto | CSS length.
  '--preview-link-border-radius': '0',
  '--preview-link-hover-text-decoration-line': 'underline',
  '--preview-link-hover-text-decoration-style': 'solid',
  '--preview-link-hover-text-decoration-thickness': '1px',
  '--preview-link-text-decoration-line': 'underline',
  '--preview-link-text-decoration-style': 'solid',
  '--preview-link-text-decoration-thickness': '1px',
  '--preview-link-text-underline-offset': '3px',

  // Task list checkboxes
  // Size, radius, border width, and checkmark dimensions accept CSS lengths.
  // disabled-opacity: 0..1; margin: CSS margin shorthand.
  // vertical-align: middle | baseline | text-top | text-bottom | CSS length.
  '--preview-task-list-checkbox-size': '14px',
  '--preview-task-list-checkbox-border-radius': '2px',
  '--preview-task-list-checkbox-border-width': '1px',
  '--preview-task-list-checkbox-checkmark-width': '10px',
  '--preview-task-list-checkbox-checkmark-height': '8px',
  '--preview-task-list-checkbox-disabled-opacity': '1',
  '--preview-task-list-checkbox-margin': '-3px 4px 0 -20px',
  '--preview-task-list-checkbox-vertical-align': 'middle',

  // Code blocks
  // Border width 0 removes the border. Radii and padding accept CSS lengths.
  '--preview-code-block-border-radius': '0',
  '--preview-code-block-border-width': '0',
  '--preview-code-block-copy-button-border-radius': '6px',
  '--preview-code-block-padding': '14px',
  '--preview-code-block-scrollbar-border-radius': '999px',
  '--preview-code-block-scrollbar-bottom': '4px',
  '--preview-code-block-scrollbar-height': '6px',
  '--preview-code-block-scrollbar-inset': '8px',

  // Blockquote layout
  // Border inset moves the marker inward; border width 0 hides it. All values accept CSS lengths.
  '--preview-blockquote-border-inset': '8px',
  '--preview-blockquote-border-line-radius': '0',
  '--preview-blockquote-border-radius': '0',
  '--preview-blockquote-border-width': '4px',
  // Icon position: top | topright | right | bottomright | bottom | bottomleft | left | topleft.
  '--preview-blockquote-icon-position': 'topleft',
  '--preview-blockquote-icon-size': '32px',
  // Space between icon and label. Accepts CSS lengths such as 0, 6px, or 0.5em.
  '--preview-blockquote-icon-label-gap': '2px',
  // Icon visibility: Visible | Hidden. Hidden does not reserve icon space.
  '--preview-blockquote-icon-visibility': 'Visible',
  // Label font size accepts CSS sizes such as 12px, 0.875em, or 1rem.
  '--preview-blockquote-label-font-size': '0.9em',
  // Label font weight: normal | bold | 100..900.
  '--preview-blockquote-label-font-weight': '400',
  // Label text: Hidden | Uppercase | Lowercase | Capitalized.
  '--preview-blockquote-label-text-transform': 'Capitalized',
  // Label position relative to the icon: Left | Right | Top | Bottom.
  '--preview-blockquote-label-position': 'Right',
  '--preview-blockquote-padding': '8px 16px',

  // Expander layout
  // Border, marker, and divider values accept CSS lengths; margin and padding use CSS shorthand.
  '--preview-expander-border-radius': '0',
  '--preview-expander-border-width': '0',
  '--preview-expander-margin': '16px 0',
  '--preview-expander-summary-padding': '8px 12px',
  '--preview-expander-summary-gap': '8px',
  '--preview-expander-summary-font-weight': '600',
  '--preview-expander-marker-size': '9px',
  '--preview-expander-content-padding': '10px 12px',
  '--preview-expander-divider-width': '0',
  '--preview-expander-focus-ring-width': '2px',
  '--preview-expander-focus-ring-offset': '-2px',

  // Tables
  // Border width 0 removes that line. Use row, column, header, and outer widths to shape the grid.
  '--preview-table-border-radius': '0',
  '--preview-table-cell-padding': '6px 12px',
  '--preview-table-column-border-width': '1px',
  '--preview-table-header-border-width': '1px',
  '--preview-table-last-row-border-width': '0',
  '--preview-table-outer-border-width': '1px',
  '--preview-table-row-border-width': '1px',
} satisfies PreviewThemeVariables

// Typography tokens: font stacks used inside rendered markdown.
const repositoryDarkPreviewTypographyVariables = {
  // Code
  // CSS font-family stack used by inline code and code blocks.
  '--font-mono':
      "'Cascadia Code', 'Cascadia Mono', 'JetBrains Mono', Consolas, 'Courier New', monospace",

  // Keyboard keys
  '--preview-keyboard-key-font-family': 'var(--font-mono)',
  '--preview-keyboard-key-font-size': '0.78em',
  '--preview-keyboard-key-font-weight': '600',

  // Markdown body
  // CSS font-family stack used by normal markdown text.
  '--font-preview': "'Segoe UI', Arial, sans-serif",

  // Tags
  // CSS font values used by Draft tag pills.
  '--preview-tag-font-family': 'var(--font-preview)',
  '--preview-tag-font-weight': '700',
  '--preview-tag-font-size': '0.78em',
} satisfies PreviewThemeVariables

export const repositoryDarkPreviewTheme: DraftPreviewTheme = {
  cssVariables: {
    ...repositoryDarkPreviewColorVariables,
    ...repositoryDarkPreviewLayoutVariables,
    ...repositoryDarkPreviewTypographyVariables,
  },
  id: 'repositoryDark',
  label: 'Repository Dark',
  /**
   * true: fenced code blocks receive Shiki token colors.
   * false: code blocks use the plain theme foreground color.
   */
  usePrettyCode: true,
  /**
   * Shiki theme used by rehype-pretty-code when usePrettyCode is true.
   */
  prettyCodeTheme: 'github-dark',
  /**
   * true: table stretches to the full preview width.
   * false: table uses content width, capped at the preview width.
   */
  stretchTablesToFullWidth: false,
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
  orderedListMarkerStyles: [
      { numbering: 'decimal', fontWeight: 'normal' },
      { numbering: 'roman', fontWeight: 'normal' },
      { numbering: 'alphabetical', fontWeight: 'normal' },
  ],
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
  unorderedListMarkerStyles: [
      { shape: 'disc', size: '1em' },
      { shape: 'circle', size: '1em' },
      { shape: 'square', size: '1em' },
  ],
  /**
   * 0 disables looping. 1 repeats the whole unordered marker array once.
   */
  unorderedListMarkerLoopCount: 0,
}

export default repositoryDarkPreviewTheme
