import { createContext } from 'react'
import {
  normalizeAppLanguage,
  translate,
  type AppLanguage,
  type TranslationParams,
} from './localization'

export type TranslationFunction = {
  (key: string): string
  (key: string, params: TranslationParams): string
  (key: string, fallback: string, params?: TranslationParams): string
}

export function resolveTranslationArguments(
  fallbackOrParams?: string | TranslationParams,
  params?: TranslationParams,
) {
  return typeof fallbackOrParams === 'string'
    ? { fallback: fallbackOrParams, params }
    : { fallback: undefined, params: fallbackOrParams }
}

export type LocalizationContextValue = {
  language: AppLanguage
  t: TranslationFunction
}

const defaultLanguage = normalizeAppLanguage('en')

export const LocalizationContext = createContext<LocalizationContextValue>({
  language: defaultLanguage,
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
      language: defaultLanguage,
      params: resolvedArguments.params,
    })
  },
})
