import {
  useMemo,
  type ReactNode,
} from 'react'
import {
  normalizeAppLanguage,
  translate,
} from './localization'
import {
  LocalizationContext,
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
  const value = useMemo<LocalizationContextValue>(
    () => ({
      language: normalizedLanguage,
      t: (key, fallback, params) =>
        translate(key, {
          fallback,
          language: normalizedLanguage,
          params,
        }),
    }),
    [normalizedLanguage],
  )

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  )
}
