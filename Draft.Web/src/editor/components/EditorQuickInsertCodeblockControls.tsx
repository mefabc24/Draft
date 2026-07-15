import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import type { CreateCodeBlockMarkdownData } from '../commands/createCodeBlockMarkdown'
import { useToolbarMenuScrollbar } from '../../toolbar/hooks/useToolbarMenuScrollbar'
import { useTranslation } from '../../localization/useTranslation'

type CodeblockLanguageOption = {
  aliases?: string[]
  code: string
  label: string
  value: string
}

type EditorQuickInsertCodeblockControlsProps = {
  onConfirm: (
    codeBlockData: CreateCodeBlockMarkdownData,
    keepOpen?: boolean,
  ) => void
  shouldKeepOpen: (event: ReactMouseEvent<HTMLButtonElement>) => boolean
}

const codeblockLanguageOptions: CodeblockLanguageOption[] = [
  { code: '', label: 'None', value: '' },
  { aliases: ['plain', 'plaintext', 'txt'], code: 'TXT', label: 'Plain Text', value: 'text' },
  { aliases: ['patch'], code: 'DIFF', label: 'Diff', value: 'diff' },
  { code: 'JAVA', label: 'Java', value: 'java' },
  { aliases: ['csharp', 'c sharp', 'dotnet', '.net'], code: 'CS', label: 'C-Sharp', value: 'csharp' },
  { aliases: ['cpp', 'cplusplus'], code: 'CPP', label: 'C++', value: 'cpp' },
  { code: 'C', label: 'C', value: 'c' },
  { aliases: ['objc'], code: 'OBJC', label: 'Objective-C', value: 'objective-c' },
  { code: 'KT', label: 'Kotlin', value: 'kotlin' },
  { aliases: ['md'], code: 'MD', label: 'Markdown', value: 'markdown' },
  { aliases: ['py'], code: 'PY', label: 'Python', value: 'python' },
  { aliases: ['js', 'ecmascript', 'node'], code: 'JS', label: 'JavaScript', value: 'javascript' },
  { code: 'JSX', label: 'JSX', value: 'jsx' },
  { aliases: ['ts'], code: 'TS', label: 'TypeScript', value: 'typescript' },
  { code: 'TSX', label: 'TSX', value: 'tsx' },
  { code: 'HTML', label: 'HTML', value: 'html' },
  { code: 'CSS', label: 'CSS', value: 'css' },
  { code: 'SCSS', label: 'SCSS', value: 'scss' },
  { code: 'SASS', label: 'Sass', value: 'sass' },
  { code: 'LESS', label: 'Less', value: 'less' },
  { code: 'VUE', label: 'Vue', value: 'vue' },
  { code: 'SVELTE', label: 'Svelte', value: 'svelte' },
  { code: 'JSON', label: 'JSON', value: 'json' },
  { code: 'JSONC', label: 'JSONC', value: 'jsonc' },
  { aliases: ['gql'], code: 'GQL', label: 'GraphQL', value: 'graphql' },
  { aliases: ['shell', 'sh', 'zsh'], code: 'SH', label: 'Bash', value: 'bash' },
  { aliases: ['ps', 'pwsh'], code: 'PS', label: 'PowerShell', value: 'powershell' },
  { aliases: ['bat', 'cmd'], code: 'BAT', label: 'Batch', value: 'bat' },
  { code: 'SQL', label: 'SQL', value: 'sql' },
  { aliases: ['yml'], code: 'YAML', label: 'YAML', value: 'yaml' },
  { code: 'TOML', label: 'TOML', value: 'toml' },
  { code: 'INI', label: 'INI', value: 'ini' },
  { code: 'CSV', label: 'CSV', value: 'csv' },
  { code: 'XML', label: 'XML', value: 'xml' },
  { aliases: ['docker'], code: 'DOCKER', label: 'Dockerfile', value: 'dockerfile' },
  { aliases: ['tf'], code: 'HCL', label: 'Terraform', value: 'terraform' },
  { aliases: ['make'], code: 'MAKE', label: 'Makefile', value: 'makefile' },
  { aliases: ['golang'], code: 'GO', label: 'Go', value: 'go' },
  { code: 'RS', label: 'Rust', value: 'rust' },
  { code: 'PHP', label: 'PHP', value: 'php' },
  { code: 'RB', label: 'Ruby', value: 'ruby' },
  { code: 'SWIFT', label: 'Swift', value: 'swift' },
  { code: 'DART', label: 'Dart', value: 'dart' },
  { code: 'SCALA', label: 'Scala', value: 'scala' },
  { code: 'R', label: 'R', value: 'r' },
  { aliases: ['jl'], code: 'JL', label: 'Julia', value: 'julia' },
  { code: 'LUA', label: 'Lua', value: 'lua' },
  { aliases: ['pl'], code: 'PL', label: 'Perl', value: 'perl' },
  { aliases: ['hs'], code: 'HS', label: 'Haskell', value: 'haskell' },
  { aliases: ['ex', 'exs'], code: 'EX', label: 'Elixir', value: 'elixir' },
  { aliases: ['erl'], code: 'ERL', label: 'Erlang', value: 'erlang' },
  { aliases: ['clj'], code: 'CLJ', label: 'Clojure', value: 'clojure' },
  { aliases: ['fsharp', 'f sharp'], code: 'FS', label: 'F-Sharp', value: 'fsharp' },
  { aliases: ['asm'], code: 'ASM', label: 'Assembly', value: 'asm' },
]

function SearchIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16">
      <circle cx="7" cy="7" r="4.25" />
      <path d="m10.2 10.2 2.8 2.8" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16">
      <path d="m3.25 8.3 3 3 6.5-6.75" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16">
      <path d="M4 6.25 8 10l4-3.75" />
    </svg>
  )
}

function normalizeSearchValue(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/\+/gu, 'plus')
    .replace(/#/gu, 'sharp')
    .replace(/[^a-z0-9]+/gu, '')
}

function isSubsequence(query: string, candidate: string) {
  let queryIndex = 0

  for (const character of candidate) {
    if (character === query[queryIndex]) {
      queryIndex += 1
    }

    if (queryIndex === query.length) {
      return true
    }
  }

  return false
}

function getLanguageOptionLabel(
  option: CodeblockLanguageOption,
  t: (key: string, fallback: string) => string,
) {
  const languageKey = option.value || 'none'

  return t(`quickInsert.codeblock.languages.${languageKey}`, option.label)
}

function getOptionSearchValues(
  option: CodeblockLanguageOption,
  t: (key: string, fallback: string) => string,
) {
  return [
    getLanguageOptionLabel(option, t),
    option.value,
    option.code,
    ...(option.aliases ?? []),
  ].map(normalizeSearchValue)
}

function getOptionScore(
  option: CodeblockLanguageOption,
  query: string,
  t: (key: string, fallback: string) => string,
) {
  if (!query) {
    return 0
  }

  const values = getOptionSearchValues(option, t)
  const bestScore = values.reduce<number | null>((score, value) => {
    let nextScore: number | null = null

    if (value === query) {
      nextScore = 0
    } else if (value.startsWith(query)) {
      nextScore = 1
    } else if (value.includes(query)) {
      nextScore = 2
    } else if (isSubsequence(query, value)) {
      nextScore = 3
    }

    if (nextScore === null) {
      return score
    }

    return score === null ? nextScore : Math.min(score, nextScore)
  }, null)

  return bestScore
}

function filterLanguageOptions(
  searchValue: string,
  t: (key: string, fallback: string) => string,
) {
  const query = normalizeSearchValue(searchValue)

  return codeblockLanguageOptions
    .map((option, index) => ({
      index,
      option,
      score: getOptionScore(option, query, t),
    }))
    .filter((result) => result.score !== null)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return (left.score ?? 0) - (right.score ?? 0)
      }

      return left.index - right.index
    })
    .map((result) => result.option)
}

function EditorQuickInsertCodeblockControls({
  onConfirm,
  shouldKeepOpen,
}: EditorQuickInsertCodeblockControlsProps) {
  const { t } = useTranslation()
  const [selectedLanguage, setSelectedLanguage] = useState(
    codeblockLanguageOptions[0],
  )
  const [searchValue, setSearchValue] = useState('')
  const [open, setOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const {
    scrollRef: optionsScrollRef,
    scrollbarRef: optionsScrollbarRef,
    thumbRef: optionsScrollbarThumbRef,
    syncScrollbarPosition,
    handleTrackPointerDown,
    handleThumbPointerCancel,
    handleThumbPointerDown,
    handleThumbPointerMove,
    handleThumbPointerUp,
  } = useToolbarMenuScrollbar(open)
  const filteredOptions = useMemo(
    () => filterLanguageOptions(searchValue, t),
    [searchValue, t],
  )

  useEffect(() => {
    if (!open) {
      return
    }

    const frameId = window.requestAnimationFrame(syncScrollbarPosition)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [filteredOptions.length, open, syncScrollbarPosition])

  return (
    <div className="editor-quick-insert-codeblock-controls">
      <div className="editor-quick-insert-codeblock-field">
        <span className="editor-quick-insert-codeblock-label">
          {t('quickInsert.codeblock.type')}
        </span>
        <div
          className={`editor-quick-insert-codeblock-select${
            open ? ' is-open' : ''
          }`}
        >
          <button
            type="button"
            className="editor-quick-insert-codeblock-combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            onClick={() => {
              setOpen((currentOpen) => {
                const nextOpen = !currentOpen

                if (nextOpen) {
                  window.setTimeout(() => searchInputRef.current?.focus(), 0)
                }

                return nextOpen
              })
            }}
          >
            <span>{getLanguageOptionLabel(selectedLanguage, t)}</span>
            <span className="editor-quick-insert-codeblock-combobox-chevron">
              <ChevronIcon />
            </span>
          </button>
          <div
            className={`editor-quick-insert-codeblock-popup-frame${
              open ? ' is-open' : ''
            }`}
            aria-hidden={!open}
          >
            <div
              className="editor-quick-insert-codeblock-popup"
              onMouseDown={(event) => {
                event.stopPropagation()
              }}
            >
              <label className="editor-quick-insert-codeblock-search">
                <SearchIcon />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchValue}
                  placeholder={t(
                    'quickInsert.codeblock.searchLanguages',
                  )}
                  tabIndex={open ? undefined : -1}
                  onChange={(event) => {
                    setSearchValue(event.target.value)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      setOpen(false)
                    }
                  }}
                />
              </label>
              <div className="editor-quick-insert-codeblock-options-wrap">
                <div
                  ref={optionsScrollRef}
                  className="editor-quick-insert-codeblock-options"
                  role="listbox"
                  aria-label={t(
                    'quickInsert.codeblock.language',
                  )}
                  data-scrollable="false"
                >
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map((option) => {
                      const selected = option.value === selectedLanguage.value

                      return (
                        <button
                          type="button"
                          className={`editor-quick-insert-codeblock-option${
                            selected ? ' is-selected' : ''
                          }`}
                          key={option.value || 'none'}
                          role="option"
                          aria-selected={selected}
                          tabIndex={open ? undefined : -1}
                          onClick={() => {
                            setSelectedLanguage(option)
                            setOpen(false)
                            setSearchValue('')
                          }}
                        >
                          <span className="editor-quick-insert-codeblock-option-label">
                            {getLanguageOptionLabel(option, t)}
                          </span>
                          {selected ? (
                            <span className="editor-quick-insert-codeblock-option-check">
                              <CheckIcon />
                            </span>
                          ) : (
                            <span className="editor-quick-insert-codeblock-option-code">
                              {option.code}
                            </span>
                          )}
                        </button>
                      )
                    })
                  ) : (
                    <div className="editor-quick-insert-codeblock-empty">
                      {t('quickInsert.codeblock.noLanguagesFound')}
                    </div>
                  )}
                </div>
                <div
                  ref={optionsScrollbarRef}
                  className="editor-quick-insert-codeblock-scrollbar"
                  data-dragging="false"
                  data-scrollable="false"
                  aria-hidden="true"
                  onPointerDown={handleTrackPointerDown}
                >
                  <div
                    ref={optionsScrollbarThumbRef}
                    className="editor-quick-insert-codeblock-scrollbar-thumb"
                    onPointerCancel={handleThumbPointerCancel}
                    onPointerDown={handleThumbPointerDown}
                    onPointerMove={handleThumbPointerMove}
                    onPointerUp={handleThumbPointerUp}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <button
        type="button"
        className="editor-quick-insert-table-confirm"
        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
          onConfirm(
            { language: selectedLanguage.value },
            shouldKeepOpen(event),
          )
        }}
      >
        {t('common.create')}
      </button>
    </div>
  )
}

export default EditorQuickInsertCodeblockControls
