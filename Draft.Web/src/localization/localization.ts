export type AppLanguage = string

type TranslationDictionary = Record<string, string>

export type TranslationParams = Record<string, number | string>

type LocalizationMetadata = {
  code: string
  displayName: string
  englishName: string
  flag?: string
  shortName: string
}

type LocalizationResource = {
  meta: LocalizationMetadata
  translations: TranslationDictionary
}

const fallbackLanguage: AppLanguage = 'en'
const localizationModules = import.meta.glob('./*.json', { eager: true }) as
  Record<string, { default: unknown }>
const localizationResources = loadLocalizationResources(localizationModules)
const dictionaries = Object.fromEntries(
  localizationResources.map((resource) => [
    resource.meta.code,
    resource.translations,
  ]),
) as Record<AppLanguage, TranslationDictionary>
let currentLanguage: AppLanguage = fallbackLanguage

export function normalizeAppLanguage(value: unknown): AppLanguage {
  if (typeof value !== 'string') {
    return fallbackLanguage
  }

  const normalizedValue = value.trim().toLowerCase()

  if (
    normalizedValue === 'english' ||
    normalizedValue === 'system'
  ) {
    return fallbackLanguage
  }

  return dictionaries[normalizedValue] ? normalizedValue : fallbackLanguage
}

export function getCurrentAppLanguage() {
  return currentLanguage
}

export function setCurrentAppLanguage(value: unknown) {
  currentLanguage = normalizeAppLanguage(value)
}

export function translate(
  key: string,
  options: {
    fallback?: string
    language?: unknown
    params?: TranslationParams
  } = {},
) {
  const language =
    options.language === undefined
      ? currentLanguage
      : normalizeAppLanguage(options.language)
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

function loadLocalizationResources(
  modules: Record<string, { default: unknown }>,
) {
  const resources = Object.entries(modules)
    .map(([path, module]) => readLocalizationResource(path, module.default))
    .filter((resource): resource is LocalizationResource => resource !== null)

  if (resources.some((resource) => resource.meta.code === fallbackLanguage)) {
    return resources
  }

  return [
    {
      meta: {
        code: fallbackLanguage,
        displayName: 'English',
        englishName: 'English',
        shortName: 'EN',
      },
      translations: {},
    },
    ...resources,
  ]
}

function readLocalizationResource(path: string, value: unknown) {
  if (!isRecord(value)) {
    return null
  }

  const fallbackCode = readCodeFromPath(path)
  const meta = readMetadata(value.meta, fallbackCode)
  const translations = readTranslations(value.translations ?? value)

  return {
    meta,
    translations,
  } satisfies LocalizationResource
}

function readMetadata(value: unknown, fallbackCode: string) {
  const normalizedFallbackCode = normalizeLanguageCode(fallbackCode)

  if (!isRecord(value)) {
    return {
      code: normalizedFallbackCode,
      displayName: normalizedFallbackCode,
      englishName: normalizedFallbackCode,
      shortName: normalizedFallbackCode.toUpperCase(),
    } satisfies LocalizationMetadata
  }

  const code = normalizeLanguageCode(readString(value.code, fallbackCode))
  const displayName = readString(value.displayName, code)

  return {
    code,
    displayName,
    englishName: readString(value.englishName, displayName),
    flag: readOptionalString(value.flag),
    shortName: readString(value.shortName, code.toUpperCase()),
  } satisfies LocalizationMetadata
}

function readTranslations(value: unknown) {
  const translations: TranslationDictionary = {}

  if (!isRecord(value)) {
    return translations
  }

  for (const [key, translation] of Object.entries(value)) {
    if (typeof translation === 'string') {
      translations[key] = translation
    }
  }

  return translations
}

function readCodeFromPath(path: string) {
  return path.split('/').pop()?.replace(/\.json$/u, '') ?? fallbackLanguage
}

function normalizeLanguageCode(value: string) {
  return value.trim().toLowerCase() || fallbackLanguage
}

function readString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function readOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
