import repositoryDarkPreviewTheme from './repositoryDark.previewTheme'
import type { DraftPreviewTheme } from './support/previewThemeTypes'

type PreviewThemeVariables = DraftPreviewTheme['cssVariables']

// Repository Light keeps Repository Dark's GitHub-oriented structure while
// replacing every color variable with a GitHub-like light palette.
const repositoryLightPreviewColorVariables = {
  // Document
  '--preview-background': '#FFFFFF',
  '--preview-foreground': '#1F2328',

  // Basic text formatting
  '--preview-bold-foreground': 'currentColor',
  '--preview-italic-foreground': 'currentColor',
  '--preview-strikethrough-foreground': 'currentColor',
  '--preview-strikethrough-text-decoration-color': 'currentColor',
  '--preview-underline-foreground': 'currentColor',
  '--preview-underline-text-decoration-color': 'currentColor',

  // Headings: text color
  '--preview-heading-foreground': '#1F2328',
  '--preview-h1-foreground': '#1F2328',
  '--preview-h2-foreground': '#1F2328',
  '--preview-h3-foreground': '#1F2328',
  '--preview-h4-foreground': '#1F2328',
  '--preview-h5-foreground': '#1F2328',
  '--preview-h6-foreground': '#59636E',

  // Headings: background color
  '--preview-heading-background': 'transparent',
  '--preview-h1-background': 'transparent',
  '--preview-h2-background': 'transparent',
  '--preview-h3-background': 'transparent',
  '--preview-h4-background': 'transparent',
  '--preview-h5-background': 'transparent',
  '--preview-h6-background': 'transparent',

  // Headings: underline color
  '--preview-h1-line-color': '#D0D7DE',
  '--preview-h2-line-color': '#D0D7DE',
  '--preview-h3-line-color': '#D0D7DE',
  '--preview-h4-line-color': '#D0D7DE',
  '--preview-h5-line-color': '#D0D7DE',
  '--preview-h6-line-color': '#D0D7DE',

  // Horizontal rule
  '--preview-rule-border': '#D0D7DE',

  // Images
  '--preview-image-border': 'transparent',

  // Links
  '--preview-link-background': 'transparent',
  '--preview-link-foreground': '#0969DA',
  '--preview-link-text-decoration-color': '#0969DA',
  '--preview-link-hover-background': 'transparent',
  '--preview-link-hover-foreground': '#0550AE',
  '--preview-link-hover-text-decoration-color': '#0550AE',

  // Inline code
  '--preview-inline-code-background': '#EFF1F3',
  '--preview-inline-code-border': 'transparent',
  '--preview-inline-code-foreground': '#1F2328',

  // Keyboard keys
  '--preview-keyboard-key-background': '#F6F8FA',
  '--preview-keyboard-key-foreground': '#1F2328',
  '--preview-keyboard-key-border': '#D0D7DE',
  '--preview-keyboard-key-border-bottom': '#8C959F',

  // Draft inline extensions
  '--preview-highlight-background': 'rgba(255, 212, 0, 0.28)',
  '--preview-highlight-foreground': '#1F2328',
  '--preview-spoiler-background': '#1F2328',
  '--preview-spoiler-revealed-background': 'rgba(175, 184, 193, 0.20)',
  '--preview-spoiler-foreground': '#1F2328',
  '--preview-tag-default-color': '#0969DA',
  '--preview-tag-text-decoration-color': 'currentColor',
  '--preview-tag-background-opacity': '12%',

  // Task list checkboxes
  '--preview-task-list-checkbox-background': '#FFFFFF',
  '--preview-task-list-checkbox-border': '#8C959F',
  '--preview-task-list-checkbox-foreground': 'transparent',
  '--preview-task-list-checkbox-checked-background': '#1A7F37',
  '--preview-task-list-checkbox-checked-border': 'transparent',
  '--preview-task-list-checkbox-checked-foreground': '#FFFFFF',

  // Code blocks
  '--preview-code-block-background': '#F6F8FA',
  '--preview-code-block-copy-button-background': '#F6F8FA',
  '--preview-code-block-border': '#D0D7DE',
  '--preview-code-block-copy-icon-foreground': '#1F2328',
  '--preview-code-block-foreground': '#1F2328',
  '--preview-code-block-scrollbar-thumb': '#8C959F',
  '--preview-code-block-scrollbar-track': 'transparent',

  // Blockquote colors
  '--preview-blockquote-default-color': '#656D76',
  '--preview-blockquote-note-color': '#0969DA',
  '--preview-blockquote-info-color': '#0969DA',
  '--preview-blockquote-tip-color': '#1A7F37',
  '--preview-blockquote-important-color': '#8250DF',
  '--preview-blockquote-warning-color': '#9A6700',
  '--preview-blockquote-caution-color': '#BC4C00',
  '--preview-blockquote-error-color': '#CF222E',
  '--preview-blockquote-success-color': '#1A7F37',
  '--preview-blockquote-good-color': '#1A7F37',
  '--preview-blockquote-bad-color': '#CF222E',
  '--preview-blockquote-pro-color': '#1A7F37',
  '--preview-blockquote-con-color': '#CF222E',
  '--preview-blockquote-question-color': '#1B7C83',
  '--preview-blockquote-todo-color': '#656D76',
  '--preview-blockquote-background-opacity': '0',
  '--preview-blockquote-bold-uses-callout-color': 'true',

  // Expanders
  '--preview-expander-background': 'transparent',
  '--preview-expander-border': 'transparent',
  '--preview-expander-summary-background': '#F6F8FA',
  '--preview-expander-summary-foreground': '#1F2328',
  '--preview-expander-summary-hover-background': '#EAEEF2',
  '--preview-expander-summary-hover-foreground': '#1F2328',
  '--preview-expander-marker-foreground': '#1F2328',
  '--preview-expander-content-background': 'transparent',
  '--preview-expander-content-foreground': '#1F2328',
  '--preview-expander-divider': '#D0D7DE',
  '--preview-expander-focus-ring': '#0969DA',

  // Tables
  '--preview-table-border': 'transparent',
  '--preview-table-cell-background': 'transparent',
  '--preview-table-column-border': '#D0D7DE',
  '--preview-table-header-background': '#F6F8FA',
  '--preview-table-header-border': '#D0D7DE',
  '--preview-table-header-foreground': '#1F2328',
  '--preview-table-outer-border': '#D0D7DE',
  '--preview-table-row-border': '#D0D7DE',

  // Scrollbars
  '--preview-scrollbar-thumb': '#8C959F',
  '--preview-scrollbar-track': 'transparent',
} satisfies PreviewThemeVariables

export const repositoryLightPreviewTheme: DraftPreviewTheme = {
  ...repositoryDarkPreviewTheme,
  colorScheme: 'light',
  cssVariables: {
    ...repositoryDarkPreviewTheme.cssVariables,
    ...repositoryLightPreviewColorVariables,
  },
  familyId: 'repository',
  id: 'repositoryLight',
  label: 'Repository Light',
  prettyCodeTheme: 'github-light',
}

export default repositoryLightPreviewTheme
