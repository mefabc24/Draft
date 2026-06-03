export const calloutTypes = [
  'default',
  'note',
  'info',
  'tip',
  'important',
  'warning',
  'caution',
  'error',
  'success',
  'question',
  'todo',
] as const

export type CalloutType = (typeof calloutTypes)[number]
export type ExplicitCalloutType = Exclude<CalloutType, 'default'>

export const explicitCalloutTypes = calloutTypes.filter(
  (calloutType): calloutType is ExplicitCalloutType =>
    calloutType !== 'default',
)

export const calloutLabels = {
  default: 'Quote',
  note: 'Note',
  info: 'Info',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
  error: 'Error',
  success: 'Success',
  question: 'Question',
  todo: 'Todo',
} satisfies Record<CalloutType, string>

export function isCalloutType(value: string): value is CalloutType {
  return calloutTypes.includes(value as CalloutType)
}

export function normalizeCalloutType(value: string): CalloutType {
  const normalizedValue = value.trim().toLowerCase()

  return isCalloutType(normalizedValue) ? normalizedValue : 'default'
}

export function getCalloutMarker(calloutType: ExplicitCalloutType) {
  return `[!${calloutType.toUpperCase()}]`
}
