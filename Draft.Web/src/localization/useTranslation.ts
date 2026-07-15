import { useContext } from 'react'
import { LocalizationContext } from './localizationContext'

export function useTranslation() {
  return useContext(LocalizationContext)
}
