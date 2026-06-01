import type { HeadingValue, InlineFormat, ListValue } from '../markdown'
import type { ToolbarDropdownMenuEntry } from './components/ToolbarDropdown'
import type { ToolbarTooltipContent } from './components/ToolbarTooltip'
import ToolbarIcon, { type ToolbarIconName } from './components/ToolbarIcon'

export const headingLabels: Record<HeadingValue, string> = {
  normal: 'Normal',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  h5: 'Heading 5',
  h6: 'Heading 6',
  blockquote: 'Blockquote',
  codeblock: 'Code Block',
}

export const headingItems: ToolbarDropdownMenuEntry[] = [
  { value: 'normal', label: 'Normal', shortcut: 'CTRL+N' },
  { value: 'h1', label: 'Heading 1', shortcut: 'CTRL+1' },
  { value: 'h2', label: 'Heading 2', shortcut: 'CTRL+2' },
  { value: 'h3', label: 'Heading 3', shortcut: 'CTRL+3' },
  { id: 'heading-divider-h3', type: 'divider' },
  { value: 'h4', label: 'Heading 4', shortcut: 'CTRL+4' },
  { value: 'h5', label: 'Heading 5', shortcut: 'CTRL+5' },
  { value: 'h6', label: 'Heading 6', shortcut: 'CTRL+6' },
  { id: 'heading-divider-h6', type: 'divider' },
  {
    value: 'blockquote',
    label: 'Blockquote',
    icon: <ToolbarIcon name="blockquote" />,
  },
  {
    value: 'codeblock',
    label: 'Code Block',
    icon: <ToolbarIcon name="codeBlock" />,
  },
]

export const listLabels: Record<ListValue, string> = {
  none: 'None',
  bullet: 'Bullet List',
  numbered: 'Numbered List',
  checklist: 'Checklist',
}

export const listIcons: Record<ListValue, ToolbarIconName> = {
  none: 'noneList',
  bullet: 'bulletList',
  numbered: 'numberedList',
  checklist: 'taskList',
}

export const headingShortcuts: Partial<Record<HeadingValue, string>> = {
  normal: 'CTRL + N',
  h1: 'CTRL + 1',
  h2: 'CTRL + 2',
  h3: 'CTRL + 3',
  h4: 'CTRL + 4',
  h5: 'CTRL + 5',
  h6: 'CTRL + 6',
}

export const inlineTooltips: Record<InlineFormat, ToolbarTooltipContent> = {
  bold: { label: 'Bold', shortcut: 'CTRL + B' },
  italic: { label: 'Italic', shortcut: 'CTRL + I' },
  underline: { label: 'Underline', shortcut: 'CTRL + U' },
  strikethrough: {
    label: 'Strikethrough',
    shortcut: 'CTRL + SHIFT + X',
  },
  code: { label: 'Inline Code', shortcut: 'CTRL + E' },
  spoiler: { label: 'Spoiler', shortcut: 'CTRL + SHIFT + S' },
  link: { label: 'Link', shortcut: 'CTRL + K' },
  image: { label: 'Image', shortcut: 'CTRL + ALT + I' },
}

export const listItems: ToolbarDropdownMenuEntry[] = [
  { value: 'none', label: 'None', icon: <ToolbarIcon name="noneList" /> },
  {
    value: 'bullet',
    label: 'Bullet List',
    icon: <ToolbarIcon name="bulletList" />,
  },
  {
    value: 'numbered',
    label: 'Numbered List',
    icon: <ToolbarIcon name="numberedList" />,
  },
  {
    value: 'checklist',
    label: 'Checklist',
    icon: <ToolbarIcon name="taskList" />,
  },
]
