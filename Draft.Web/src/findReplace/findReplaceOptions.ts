export type WorkspaceFindReplaceOptionId =
  | 'matchCase'
  | 'wholeWord'
  | 'regex'

export type WorkspaceFindReplaceOptionValues = Record<
  WorkspaceFindReplaceOptionId,
  boolean
>

export type WorkspaceFindReplaceOptionDefinition = {
  id: WorkspaceFindReplaceOptionId
  labelKey: string
}

export const defaultWorkspaceFindReplaceOptionValues = {
  matchCase: false,
  regex: false,
  wholeWord: false,
} satisfies WorkspaceFindReplaceOptionValues

export const workspaceFindReplaceOptions = [
  {
    id: 'matchCase',
    labelKey: 'findReplace.options.matchCase',
  },
  {
    id: 'wholeWord',
    labelKey: 'findReplace.options.wholeWord',
  },
  {
    id: 'regex',
    labelKey: 'findReplace.options.regex',
  },
] satisfies readonly WorkspaceFindReplaceOptionDefinition[]
