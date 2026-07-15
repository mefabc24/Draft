import {
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import {
  normalizeAppLanguage,
  setCurrentAppLanguage,
  translate,
  type TranslationParams,
} from './localization'
import {
  LocalizationContext,
  resolveTranslationArguments,
  type LocalizationContextValue,
} from './localizationContext'

export function LocalizationProvider({
  children,
  language,
}: {
  children: ReactNode
  language: unknown
}) {
  const normalizedLanguage = normalizeAppLanguage(language)
  useEffect(() => {
    setCurrentAppLanguage(normalizedLanguage)
  }, [normalizedLanguage])

  const value = useMemo<LocalizationContextValue>(
    () => ({
      language: normalizedLanguage,
      t: (
        key: string,
        fallbackOrParams?: string | TranslationParams,
        params?: TranslationParams,
      ) => {
        const resolvedArguments = resolveTranslationArguments(
          fallbackOrParams,
          params,
        )

        return translate(key, {
          fallback: resolvedArguments.fallback,
          language: normalizedLanguage,
          params: resolvedArguments.params,
        })
      },
    }),
    [normalizedLanguage],
  )

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  )
}
