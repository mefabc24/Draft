import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import {
    conf as baseMarkdownConfiguration,
    language as baseMarkdownLanguage,
} from 'monaco-editor/esm/vs/basic-languages/markdown/markdown.js'

export const DRAFT_THEME_NAME = 'draft-theme'
export const DRAFT_CURRENT_LINE_DECORATION_CLASS = 'editor-current-line'

let markdownTokensProvider: monaco.IDisposable | null = null
let markdownLanguageConfiguration: monaco.IDisposable | null = null
let markdownLanguageRegistered = false

function ensureDraftThemeStyles(lineHighlightBackground: string) {
    if (typeof document === 'undefined') {
        return
    }

    const styleId = 'draft-theme-overrides'
    let styleElement = document.getElementById(styleId) as HTMLStyleElement | null

    if (!styleElement) {
        styleElement = document.createElement('style')
        styleElement.id = styleId
        document.head.appendChild(styleElement)
    }

    styleElement.textContent = `
      .editor-host .monaco-editor .${DRAFT_CURRENT_LINE_DECORATION_CLASS} {
        background: ${lineHighlightBackground};
        z-index: -1;
        pointer-events: none;
      }
    `
}

function registerDraftMarkdownTokens() {
    if (!markdownLanguageRegistered) {
        monaco.languages.register({ id: 'markdown' })
        markdownLanguageRegistered = true
    }

    if (!markdownLanguageConfiguration) {
        markdownLanguageConfiguration = monaco.languages.setLanguageConfiguration(
            'markdown',
            baseMarkdownConfiguration,
        )
    }

    if (markdownTokensProvider) {
        return
    }

    const language = baseMarkdownLanguage as monaco.languages.IMonarchLanguage

    markdownTokensProvider = monaco.languages.setMonarchTokensProvider('markdown', {
        ...language,
        tokenizer: {
            ...language.tokenizer,
            root: [
                [/^\s*\|/, '@rematch', '@table_header'],
                [
                    /^(\s{0,3})(#+)(\s*)((?:[^\\#]|@escapes)+)((?:#+)?)/,
                    ['white', 'keyword.heading.marker', 'white', 'keyword.heading.text', 'keyword.heading.marker'],
                ],
                [/^\s*(=+|-+)\s*$/, 'keyword.heading.marker'],
                [/^\s*((\* ?)+)\s*$/, 'meta.separator'],
                [/^\s*>+/, 'markup.quote.marker'],
                [/^\s*([*\-+:]|\d+\.)\s/, 'keyword.list.marker'],
                [/^(\t| {4})[^ ].*$/, 'string'],
                [/^\s*~~~\s*((?:\w|[/\-#])+)?\s*$/, { token: 'string', next: '@codeblock' }],
                [
                    /^\s*```\s*((?:\w|[/\-#])+).*$/,
                    { token: 'string', next: '@codeblockgh', nextEmbedded: '$1' },
                ],
                [/^\s*```\s*$/, { token: 'string', next: '@codeblock' }],
                { include: '@linecontent' },
            ],
        },
    })
}

export function registerDraftTheme() {
    const background = '#131313'
    const foreground = '#F3FAFF'
    const hidden = '#00000000'
    const lineHighlightBackground = '#1A1A1A'
    const highlightColor = '#A5C8FF'
    const lineNumberForeground = '#504F4F'

    ensureDraftThemeStyles(lineHighlightBackground)
    registerDraftMarkdownTokens()

    monaco.editor.defineTheme(DRAFT_THEME_NAME, {
        base: 'vs-dark',
        inherit: true,

        rules: [
            { token: 'comment', foreground: '504F4F' }, // HTML comments like <!-- ... -->
            { token: 'keyword', foreground: 'A5C8FF' }, // Generic markdown markers / fallback syntax
            { token: 'keyword.heading.marker', foreground: 'A5C8FF' }, // Heading markers like # or === / ---
            { token: 'keyword.heading.text', foreground: 'A5C8FF' }, // Heading text after the # markers
            { token: 'keyword.list.marker', foreground: '79A986' }, // List markers like *, -, + or 1.
            { token: 'markup.quote.marker', foreground: 'F0BE6C' }, // Blockquote marker >
            { token: 'string', foreground: '79A986' }, // Markdown code fences / indented code
            { token: 'number', foreground: 'FFD500' }, // Numbers and numeric literals
            { token: 'regexp', foreground: 'FF00FF' }, // Regular expressions in embedded languages
            { token: 'type', foreground: 'FF8800' }, // Type names in embedded languages
            { token: 'delimiter', foreground: 'FF0000' }, // Generic punctuation / delimiters
            { token: 'delimiter.bracket', foreground: 'FF0000' }, // Brackets like (), [] or {}
        ],

        colors: {
            'editor.background': background,
            'editor.foreground': foreground,

            'editor.lineHighlightBackground': lineHighlightBackground,
            'editor.lineHighlightBorder': hidden,
            'editorCursor.foreground': highlightColor,

            'editor.selectionBackground': '#214283AA',
            'editor.inactiveSelectionBackground': '#214283AA',
            'editor.selectionHighlightBackground': '#35353570',
            'editor.selectionHighlightBorder': hidden,

            'editor.wordHighlightBackground': '#35353570',
            'editor.wordHighlightStrongBackground': '#FF880044',
            'editor.wordHighlightBorder': hidden,
            'editor.wordHighlightStrongBorder': '#FF88FF',

            'editorLineNumber.foreground': lineNumberForeground,
            'editorLineNumber.activeForeground': highlightColor,

            'editorIndentGuide.background': '#FF8800',
            'editorIndentGuide.activeBackground': '#FFD500',
            'editorWhitespace.foreground': foreground,

            'editorGutter.background': background,
            'editorOverviewRuler.border': '#FF0000',
        },
    })
}
