import type { EditorQuickInsertCommand } from '../commands/editorQuickInsertCommands'

export type EditorQuickInsertIconName =
  | 'codeblock'
  | 'heading'
  | 'image'
  | 'link'
  | 'list'
  | 'table'

type EditorQuickInsertCommandItem = {
  command: EditorQuickInsertCommand
  icon?: EditorQuickInsertIconName
  id: string
  label: string
  shortcut?: string
  type: 'item'
}

type EditorQuickInsertSection = {
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
        command: 'bullet-list',
        id: 'bullet-list',
        label: 'Bullet list',
        shortcut: '-',
        type: 'item',
      },
      {
        command: 'numbered-list',
        id: 'numbered-list',
        label: 'Numbered list',
        shortcut: '1.',
        type: 'item',
      },
      {
        command: 'task-list-unchecked',
        id: 'task-list-unchecked',
        label: 'Task unchecked',
        shortcut: '[ ]',
        type: 'item',
      },
      {
        command: 'task-list-checked',
        id: 'task-list-checked',
        label: 'Task checked',
        shortcut: '[x]',
        type: 'item',
      },
    ],
    defaultExpanded: false,
    icon: 'list',
    id: 'lists',
    label: 'Lists',
    type: 'section',
  },
  {
    children: [
      {
        command: 'heading-1',
        id: 'heading-1',
        label: 'Heading 1',
        shortcut: '#',
        type: 'item',
      },
      {
        command: 'heading-2',
        id: 'heading-2',
        label: 'Heading 2',
        shortcut: '##',
        type: 'item',
      },
      {
        command: 'heading-3',
        id: 'heading-3',
        label: 'Heading 3',
        shortcut: '###',
        type: 'item',
      },
      {
        command: 'heading-4',
        id: 'heading-4',
        label: 'Heading 4',
        shortcut: '####',
        type: 'item',
      },
    ],
    defaultExpanded: false,
    icon: 'heading',
    id: 'headings',
    label: 'Headings',
    type: 'section',
  },
  {
    children: [],
    defaultExpanded: false,
    icon: 'image',
    id: 'image',
    label: 'Image',
    type: 'section',
  },
  {
    children: [],
    defaultExpanded: false,
    icon: 'link',
    id: 'link',
    label: 'Link',
    type: 'section',
  },
  {
    children: [],
    defaultExpanded: false,
    icon: 'table',
    id: 'table',
    label: 'Table',
    type: 'section',
  },
  {
    children: [],
    defaultExpanded: false,
    icon: 'codeblock',
    id: 'codeblocks',
    label: 'Codeblocks',
    type: 'section',
  },
]
