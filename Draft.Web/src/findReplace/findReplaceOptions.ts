export type WorkspaceFindReplaceOptionDefinition = {
  defaultChecked?: boolean
  id: string
  labelKey: string
}

export const workspaceFindReplaceOptions = [
  {
    id: 'option-1',
    labelKey: 'findReplace.options.option1',
  },
  {
    id: 'option-2',
    labelKey: 'findReplace.options.option2',
  },
  {
    defaultChecked: true,
    id: 'option-3',
    labelKey: 'findReplace.options.option3',
  },
] satisfies readonly WorkspaceFindReplaceOptionDefinition[]
