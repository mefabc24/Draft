import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import {
  conf as baseMarkdownConfiguration,
  language as baseMarkdownLanguage,
} from 'monaco-editor/esm/vs/basic-languages/markdown/markdown.js'

let markdownTokensProvider: monaco.IDisposable | null = null
let markdownLanguageConfiguration: monaco.IDisposable | null = null
let plaintextLanguageConfiguration: monaco.IDisposable | null = null
let markdownLanguageRegistered = false

const draftQuotePairs = [
  { open: "'", close: "'" },
  { open: '"', close: '"' },
  { open: '`', close: '`' },
]

type LanguagePair = {
  close: string
  open: string
}

function isAngleBracketPair(pair: LanguagePair) {
  return pair.open === '<' && pair.close === '>'
}

export function registerDraftMarkdownLanguage() {
  if (!markdownLanguageRegistered) {
    monaco.languages.register({ id: 'markdown' })
    markdownLanguageRegistered = true
  }

  if (!markdownLanguageConfiguration) {
    markdownLanguageConfiguration = monaco.languages.setLanguageConfiguration(
      'markdown',
      {
        ...baseMarkdownConfiguration,
        autoClosingPairs: [
          ...(baseMarkdownConfiguration.autoClosingPairs ?? []).filter(
            (pair) => !isAngleBracketPair(pair),
          ),
          ...draftQuotePairs,
        ],
        surroundingPairs: [
          ...(baseMarkdownConfiguration.surroundingPairs ?? []).filter(
            (pair) => !isAngleBracketPair(pair),
          ),
          { open: "'", close: "'" },
          { open: '"', close: '"' },
        ],
      },
    )
  }

  if (!plaintextLanguageConfiguration) {
    plaintextLanguageConfiguration = monaco.languages.setLanguageConfiguration(
      'plaintext',
      {
        autoClosingPairs: draftQuotePairs,
        surroundingPairs: draftQuotePairs,
      },
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
          [
            'white',
            'keyword.heading.marker',
            'white',
            'keyword.heading.text',
            'keyword.heading.marker',
          ],
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
