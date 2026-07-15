import type { CalloutType } from '../markdown/callouts'

export type ToolbarCalloutOption = {
  colorVariable: `--preview-blockquote-${CalloutType}-color`
  iconPath: string
  label: string
  type: CalloutType
}

const calloutIconPaths = {
  default: 'icons/Blockquote.svg',
  note: 'icons/callouts/Note.svg',
  tip: 'icons/callouts/Tip.svg',
  important: 'icons/callouts/Important.svg',
  warning: 'icons/callouts/Warning.svg',
  caution: 'icons/callouts/Caution.svg',
  info: 'icons/callouts/Info.svg',
  question: 'icons/callouts/Question.svg',
  todo: 'icons/callouts/Todo.svg',
  success: 'icons/callouts/Success.svg',
  good: 'icons/callouts/Good.svg',
  bad: 'icons/callouts/Bad.svg',
  pro: 'icons/callouts/Pro.svg',
  con: 'icons/callouts/Contra.svg',
  error: 'icons/callouts/Error.svg',
} satisfies Record<CalloutType, string>

const calloutMenuLabels = {
  default: 'Default',
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
  info: 'Info',
  question: 'Question',
  todo: 'Todo',
  success: 'Success',
  good: 'Good',
  bad: 'Bad',
  pro: 'Pro',
  con: 'Con',
  error: 'Error',
} satisfies Record<CalloutType, string>

function createCalloutOption(type: CalloutType): ToolbarCalloutOption {
  return {
    colorVariable: `--preview-blockquote-${type}-color`,
    iconPath: calloutIconPaths[type],
    label: calloutMenuLabels[type],
    type,
  }
}

export const coreToolbarCalloutOptions = ([
  'default',
  'note',
  'tip',
  'important',
  'warning',
  'caution',
] as const).map(createCalloutOption)

export const extraToolbarCalloutOptions = ([
  'info',
  'question',
  'todo',
  'success',
  'good',
  'pro',
  'error',
  'bad',
  'con',
] as const).map(createCalloutOption)
