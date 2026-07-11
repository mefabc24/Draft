import englishMessages from './en.json'

export type AppLanguage = 'en'

type TranslationDictionary = Record<string, string>

export type TranslationParams = Record<string, number | string>

const fallbackLanguage: AppLanguage = 'en'
const dictionaries: Record<AppLanguage, TranslationDictionary> = {
  en: englishMessages,
}

export function normalizeAppLanguage(value: unknown): AppLanguage {
  if (typeof value !== 'string') {
    return fallbackLanguage
  }

  const normalizedValue = value.trim().toLowerCase()

  if (
    normalizedValue === fallbackLanguage ||
    normalizedValue === 'english' ||
    normalizedValue === 'system'
  ) {
    return fallbackLanguage
  }

  return fallbackLanguage
}

export function translate(
  key: string,
  options: {
    fallback?: string
    language?: unknown
    params?: TranslationParams
  } = {},
) {
  const language = normalizeAppLanguage(options.language)
  const text =
    dictionaries[language]?.[key] ??
    dictionaries[fallbackLanguage][key] ??
    options.fallback ??
    key

  return interpolate(text, options.params)
}

function interpolate(text: string, params: TranslationParams | undefined) {
  if (!params) {
    return text
  }

  return text.replace(/\{([^}]+)\}/g, (match, name: string) => {
    const value = params[name]
    return value === undefined ? match : String(value)
  })
}
