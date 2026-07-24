export const themeFontStacks = {
  editor:
    "'JetBrains Mono', Consolas, 'Cascadia Code', 'Cascadia Mono', 'Courier New', monospace",
  mono:
    "'JetBrains Mono', Consolas, 'Cascadia Code', 'Cascadia Mono', 'Courier New', monospace",
  preview: "'Manrope', 'Segoe UI', Arial, sans-serif",
  toolbar: "'Manrope', 'Segoe UI', Arial, sans-serif",
  ui: "'Segoe UI', Arial, sans-serif",
} as const

export type DraftAppThemeTokens = {
  accent: string
  accentDisabled: string
  accentFocusRing: string
  accentForeground: string
  accentHover: string
  accentSelection: string
  accentSelectionActive: string
  accentSoft: string
  border: string
  checkmarkForeground: string
  chromeBackground: string
  contentForeground: string
  contrastForeground: string
  controlBackground: string
  controlBorder: string
  controlBorderHover: string
  controlForeground: string
  controlHoverBackground: string
  controlPressedBackground: string
  controlSubtleHoverBackground: string
  danger: string
  dangerFocusRing: string
  dangerRecordingRing: string
  dangerRecordingShadow: string
  dangerSoft: string
  divider: string
  editorBackground: string
  editorCurrentLineBackground: string
  editorSurface: string
  foreground: string
  foregroundBright: string
  hintForeground: string
  inputBackground: string
  inputBorder: string
  inputForeground: string
  muted: string
  mutedStrong: string
  overlayHover: string
  overlayHoverStrong: string
  paneBorder: string
  scrollbarThumb: string
  selectedShortcut: string
  shadow: string
  shadowElevated: string
  success: string
  surfaceBackground: string
  thumbnailBorder: string
  toolbarForeground: string
  toolbarMuted: string
  toolbarShadow: string
  transparent: string
}

export const draftDarkTokens = {
  accentBlue: '#a5c8ff',
  accentGreen: '#79a986',
  accentYellow: '#f0be6c',
  accent: '#a5c8ff',
  accentDisabled: '#85abe3',
  accentFocusRing: 'rgba(165, 200, 255, 0.12)',
  accentForeground: '#294c7d',
  accentHover: '#b5d2ff',
  accentSelection: 'rgba(165, 200, 255, 0.2)',
  accentSelectionActive: 'rgba(165, 200, 255, 0.5)',
  accentSoft: 'rgba(165, 200, 255, 0.18)',
  appBackground: 'transparent',
  border: '#3d3d3d',
  borderSubtle: '#1f1f1f',
  checkmarkForeground: '#1b1b1b',
  chromeBackground: '#131313',
  contentForeground: '#d1d5db',
  contrastForeground: '#ffffff',
  controlBackground: '#131313',
  controlBorder: '#2c2d2f',
  controlBorderHover: '#34363a',
  controlForeground: '#91908f',
  controlHoverBackground: '#1f2020',
  controlPressedBackground: '#252626',
  controlSubtleHoverBackground: '#1d1f20',
  danger: '#e25e5e',
  dangerFocusRing: 'rgba(226, 94, 94, 0.22)',
  dangerRecordingRing: 'rgba(226, 94, 94, 0.32)',
  dangerRecordingShadow: 'rgba(226, 94, 94, 0.72)',
  dangerSoft: 'rgba(226, 94, 94, 0.12)',
  divider: '#242424',
  editorBackground: '#131313',
  editorCurrentLineBackground: '#1a1a1a',
  editorSurface: '#1b1b1b',
  foreground: '#e5e7eb',
  foregroundBright: '#f3faff',
  hintForeground: '#3f3f3f',
  inputBackground: '#333538',
  inputBorder: '#43474f',
  inputForeground: '#e2e2e6',
  muted: '#7a7a7a',
  mutedStrong: '#504f4f',
  overlayHover: 'rgba(255, 255, 255, 0.035)',
  overlayHoverStrong: 'rgba(255, 255, 255, 0.065)',
  paneBorder: '#1f1f1f',
  scrollbarThumb: '#353535',
  selectedShortcut: 'rgba(165, 200, 255, 0.55)',
  shadow: '0 12px 28px rgb(0 0 0 / 30%)',
  shadowElevated: '0 18px 42px rgb(0 0 0 / 38%)',
  success: '#79a986',
  surfaceBackground: '#1b1b1b',
  thumbnailBorder: 'rgb(255 255 255 / 10%)',
  toolbarForeground: '#acabaa',
  toolbarMuted: '#575757',
  toolbarShadow:
    '0 10px 24px rgba(0, 0, 0, 0.26), 0 2px 8px rgba(0, 0, 0, 0.22)',
  transparent: '#00000000',
  theHubAccent: '#F79817',
} as const satisfies DraftAppThemeTokens & {
  accentBlue: string
  accentGreen: string
  accentYellow: string
  appBackground: string
  borderSubtle: string
  mutedStrong: string
  theHubAccent: string
}

export const draftLightTokens = {
  accent: '#0067c0',
  accentDisabled: '#99c7e8',
  accentFocusRing: 'rgba(0, 103, 192, 0.16)',
  accentForeground: '#ffffff',
  accentHover: '#005a9e',
  accentSelection: 'rgba(0, 103, 192, 0.16)',
  accentSelectionActive: 'rgba(0, 103, 192, 0.3)',
  accentSoft: 'rgba(0, 103, 192, 0.1)',
  border: '#d6d6d6',
  checkmarkForeground: '#ffffff',
  chromeBackground: '#ffffff',
  contentForeground: '#5f5f5f',
  contrastForeground: '#1f1f1f',
  controlBackground: '#ffffff',
  controlBorder: '#d6d6d6',
  controlBorderHover: '#b3b3b3',
  controlForeground: '#5f5f5f',
  controlHoverBackground: '#e8e8e8',
  controlPressedBackground: '#dddddd',
  controlSubtleHoverBackground: '#e8e8e8',
  danger: '#c42b1c',
  dangerFocusRing: 'rgba(196, 43, 28, 0.2)',
  dangerRecordingRing: 'rgba(196, 43, 28, 0.28)',
  dangerRecordingShadow: 'rgba(196, 43, 28, 0.4)',
  dangerSoft: 'rgba(196, 43, 28, 0.1)',
  divider: '#d6d6d6',
  editorBackground: '#ffffff',
  editorCurrentLineBackground: '#f7f7f7',
  editorSurface: '#f7f7f7',
  foreground: '#1f1f1f',
  foregroundBright: '#1f1f1f',
  hintForeground: '#767676',
  inputBackground: '#f7f7f7',
  inputBorder: '#d6d6d6',
  inputForeground: '#1f1f1f',
  muted: '#5f5f5f',
  mutedStrong: '#767676',
  overlayHover: 'rgba(0, 0, 0, 0.035)',
  overlayHoverStrong: 'rgba(0, 0, 0, 0.065)',
  paneBorder: '#d6d6d6',
  scrollbarThumb: '#c1c1c1',
  selectedShortcut: '#005a9e',
  shadow: '0 12px 28px rgb(0 0 0 / 14%)',
  shadowElevated: '0 18px 42px rgb(0 0 0 / 18%)',
  success: '#107c10',
  surfaceBackground: '#f3f3f3',
  thumbnailBorder: 'rgb(0 0 0 / 10%)',
  toolbarForeground: '#5f5f5f',
  toolbarMuted: '#767676',
  toolbarShadow:
    '0 10px 24px rgba(0, 0, 0, 0.14), 0 2px 8px rgba(0, 0, 0, 0.1)',
  transparent: '#00000000',
} as const satisfies DraftAppThemeTokens
