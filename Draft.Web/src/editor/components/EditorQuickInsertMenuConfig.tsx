import type {
  EditorQuickInsertCommand,
  EditorQuickInsertTargetMode,
} from '../commands/editorQuickInsertCommands'
import { calloutLabels, type CalloutType } from '../../markdown/callouts'
import type {
  MenuItemPlacement,
  QuickInsertItemCustomization,
} from '../../settings/menuCustomization'

export type EditorQuickInsertIconName =
  | 'blockquote'
  | 'callout'
  | 'codeblock'
  | 'expander'
  | 'heading'
  | 'image'
  | 'keyboard'
  | 'link'
  | 'list'
  | 'misc'
  | 'tag'
  | 'table'

type EditorQuickInsertCommandItem = {
  calloutType?: CalloutType
  canInsertIntoNonEmptyLine: boolean
  command: EditorQuickInsertCommand
  icon?: EditorQuickInsertIconName
  id: string
  label: string
  overflow?: boolean
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
  overflow?: boolean
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
    overflow: true,
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
    icon: 'keyboard',
    id: 'keyboard',
    label: 'Keyboard',
    overflow: true,
    type: 'section',
  },
  {
    canInsertIntoNonEmptyLine: false,
    children: [],
    defaultExpanded: false,
    icon: 'expander',
    id: 'expander',
    label: 'Expander',
    overflow: true,
    type: 'section',
  },
  {
    canInsertIntoNonEmptyLine: true,
    children: [],
    defaultExpanded: false,
    icon: 'tag',
    id: 'tag',
    label: 'Tag',
    overflow: true,
    type: 'section',
  },
  {
    canInsertIntoNonEmptyLine: false,
    command: 'blockquote',
    icon: 'blockquote',
    id: 'blockquote',
    label: 'Blockquote',
    type: 'item',
  },
  {
    children: [
      {
        calloutType: 'note',
        canInsertIntoNonEmptyLine: false,
        command: 'callout-note',
        id: 'callout-note',
        label: calloutLabels.note,
        type: 'item',
      },
      {
        calloutType: 'tip',
        canInsertIntoNonEmptyLine: false,
        command: 'callout-tip',
        id: 'callout-tip',
        label: calloutLabels.tip,
        type: 'item',
      },
      {
        calloutType: 'important',
        canInsertIntoNonEmptyLine: false,
        command: 'callout-important',
        id: 'callout-important',
        label: calloutLabels.important,
        type: 'item',
      },
      {
        calloutType: 'warning',
        canInsertIntoNonEmptyLine: false,
        command: 'callout-warning',
        id: 'callout-warning',
        label: calloutLabels.warning,
        type: 'item',
      },
      {
        calloutType: 'caution',
        canInsertIntoNonEmptyLine: false,
        command: 'callout-caution',
        id: 'callout-caution',
        label: calloutLabels.caution,
        type: 'item',
      },
      {
        calloutType: 'info',
        canInsertIntoNonEmptyLine: false,
        command: 'callout-info',
        id: 'callout-info',
        label: calloutLabels.info,
        type: 'item',
      },
      {
        calloutType: 'question',
        canInsertIntoNonEmptyLine: false,
        command: 'callout-question',
        id: 'callout-question',
        label: calloutLabels.question,
        type: 'item',
      },
      {
        calloutType: 'todo',
        canInsertIntoNonEmptyLine: false,
        command: 'callout-todo',
        id: 'callout-todo',
        label: calloutLabels.todo,
        type: 'item',
      },
      {
        calloutType: 'success',
        canInsertIntoNonEmptyLine: false,
        command: 'callout-success',
        id: 'callout-success',
        label: calloutLabels.success,
        type: 'item',
      },
      {
        calloutType: 'good',
        canInsertIntoNonEmptyLine: false,
        command: 'callout-good',
        id: 'callout-good',
        label: calloutLabels.good,
        type: 'item',
      },
      {
        calloutType: 'pro',
        canInsertIntoNonEmptyLine: false,
        command: 'callout-pro',
        id: 'callout-pro',
        label: calloutLabels.pro,
        type: 'item',
      },
      {
        calloutType: 'error',
        canInsertIntoNonEmptyLine: false,
        command: 'callout-error',
        id: 'callout-error',
        label: calloutLabels.error,
        type: 'item',
      },
      {
        calloutType: 'bad',
        canInsertIntoNonEmptyLine: false,
        command: 'callout-bad',
        id: 'callout-bad',
        label: calloutLabels.bad,
        type: 'item',
      },
      {
        calloutType: 'con',
        canInsertIntoNonEmptyLine: false,
        command: 'callout-con',
        id: 'callout-con',
        label: calloutLabels.con,
        type: 'item',
      },
    ],
    canInsertIntoNonEmptyLine: false,
    defaultExpanded: false,
    icon: 'callout',
    id: 'callouts',
    label: 'Callouts',
    overflow: true,
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
    overflow: true,
    type: 'section',
  },
]

const editorQuickInsertMenuEntriesById = new Map(
  editorQuickInsertMenuEntries.map((entry) => [entry.id, entry]),
)

export function canShowEditorQuickInsertEntry(
  entry: EditorQuickInsertMenuEntry,
  targetMode: EditorQuickInsertTargetMode | null,
) {
  return targetMode !== 'insert-at-cursor' || entry.canInsertIntoNonEmptyLine
}

export function getConfiguredEditorQuickInsertEntries(
  items: QuickInsertItemCustomization[],
  placement: MenuItemPlacement,
  targetMode: EditorQuickInsertTargetMode | null,
) {
  return items.flatMap((item) => {
    if (item.placement !== placement) {
      return []
    }

    const entry = editorQuickInsertMenuEntriesById.get(item.id)
    return entry && canShowEditorQuickInsertEntry(entry, targetMode)
      ? [entry]
      : []
  })
}

export function hasAvailableEditorQuickInsertEntries(
  items: QuickInsertItemCustomization[],
  targetMode: EditorQuickInsertTargetMode,
) {
  return items.some((item) => {
    if (item.placement === 'Disabled') {
      return false
    }

    const entry = editorQuickInsertMenuEntriesById.get(item.id)
    return entry
      ? canShowEditorQuickInsertEntry(entry, targetMode)
      : false
  })
}
