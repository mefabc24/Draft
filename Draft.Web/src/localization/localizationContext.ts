import { createContext } from 'react'
import {
  normalizeAppLanguage,
  translate,
  type AppLanguage,
  type TranslationParams,
} from './localization'

export type TranslationFunction = (
  key: string,
  fallback?: string,
  params?: TranslationParams,
) => string

export type LocalizationContextValue = {
  language: AppLanguage
  t: TranslationFunction
}

const defaultLanguage = normalizeAppLanguage('en')

export const LocalizationContext = createContext<LocalizationContextValue>({
  language: defaultLanguage,
  t: (key, fallback, params) =>
    translate(key, {
      fallback,
      language: defaultLanguage,
      params,
    }),
})
