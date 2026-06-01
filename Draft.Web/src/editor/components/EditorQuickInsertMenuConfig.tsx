import type { EditorQuickInsertCommand } from '../commands/editorQuickInsertCommands'

export type EditorQuickInsertIconName =
  | 'codeblock'
  | 'heading'
  | 'image'
  | 'link'
  | 'list'
  | 'misc'
  | 'tag'
  | 'table'

type EditorQuickInsertCommandItem = {
  canInsertIntoNonEmptyLine: boolean
  command: EditorQuickInsertCommand
  icon?: EditorQuickInsertIconName
  id: string
  label: string
  shortcut?: string
  type: 'item'
}

type EditorQuickInsertSection = {
  canInsertIntoNonEmptyLine: boolean
  children: EditorQuickInsertCommandItem[]
  defaultExpanded: boolean
  icon: EditorQuickInsertIconName
  id: string
  label: string
  type: 'section'
}

export type EditorQuickInsertMenuEntry =
  | EditorQuickInsertCommandItem
  | EditorQuickInsertSection

export const editorQuickInsertMenuEntries: EditorQuickInsertMenuEntry[] = [
  {
    children: [
      {
        canInsertIntoNonEmptyLine: false,
        command: 'bullet-list',
        id: 'bullet-list',
        label: 'Bullet list',
        shortcut: '-',
        type: 'item',
      },
      {
        canInsertIntoNonEmptyLine: false,
        command: 'numbered-list',
        id: 'numbered-list',
        label: 'Numbered list',
        shortcut: '1.',
        type: 'item',
      },
      {
        canInsertIntoNonEmptyLine: false,
        command: 'task-list-unchecked',
        id: 'task-list-unchecked',
        label: 'Task unchecked',
        shortcut: '[ ]',
        type: 'item',
      },
      {
        canInsertIntoNonEmptyLine: false,
        command: 'task-list-checked',
        id: 'task-list-checked',
        label: 'Task checked',
        shortcut: '[x]',
        type: 'item',
      },
    ],
    canInsertIntoNonEmptyLine: false,
    defaultExpanded: false,
    icon: 'list',
    id: 'lists',
    label: 'Lists',
    type: 'section',
  },
  {
    children: [
      {
        canInsertIntoNonEmptyLine: false,
        command: 'heading-1',
        id: 'heading-1',
        label: 'Heading 1',
        shortcut: '#',
        type: 'item',
      },
      {
        canInsertIntoNonEmptyLine: false,
        command: 'heading-2',
        id: 'heading-2',
        label: 'Heading 2',
        shortcut: '##',
        type: 'item',
      },
      {
        canInsertIntoNonEmptyLine: false,
        command: 'heading-3',
        id: 'heading-3',
        label: 'Heading 3',
        shortcut: '###',
        type: 'item',
      },
      {
        canInsertIntoNonEmptyLine: false,
        command: 'heading-4',
        id: 'heading-4',
        label: 'Heading 4',
        shortcut: '####',
        type: 'item',
      },
    ],
    canInsertIntoNonEmptyLine: false,
    defaultExpanded: false,
    icon: 'heading',
    id: 'headings',
    label: 'Headings',
    type: 'section',
  },
  {
    canInsertIntoNonEmptyLine: true,
    children: [],
    defaultExpanded: false,
    icon: 'image',
    id: 'image',
    label: 'Image',
    type: 'section',
  },
  {
    canInsertIntoNonEmptyLine: true,
    children: [],
    defaultExpanded: false,
    icon: 'link',
    id: 'link',
    label: 'Link',
    type: 'section',
  },
  {
    canInsertIntoNonEmptyLine: true,
    children: [],
    defaultExpanded: false,
    icon: 'tag',
    id: 'tag',
    label: 'Tag',
    type: 'section',
  },
  {
    canInsertIntoNonEmptyLine: false,
    children: [],
    defaultExpanded: false,
    icon: 'table',
    id: 'table',
    label: 'Table',
    type: 'section',
  },
  {
    canInsertIntoNonEmptyLine: false,
    children: [],
    defaultExpanded: false,
    icon: 'codeblock',
    id: 'codeblocks',
    label: 'Codeblocks',
    type: 'section',
  },
  {
    children: [
      {
        canInsertIntoNonEmptyLine: false,
        command: 'blockquote',
        id: 'blockquote',
        label: 'Quote',
        shortcut: '>',
        type: 'item',
      },
      {
        canInsertIntoNonEmptyLine: false,
        command: 'horizontal-rule',
        id: 'horizontal-rule',
        label: 'Divider',
        shortcut: '---',
        type: 'item',
      },
    ],
    canInsertIntoNonEmptyLine: false,
    defaultExpanded: false,
    icon: 'misc',
    id: 'miscellaneous',
    label: 'Miscellaneous',
    type: 'section',
  },
]
