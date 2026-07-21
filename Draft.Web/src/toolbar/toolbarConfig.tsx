import {
  getInlineFormatMarkers,
  type HeadingValue,
  type InlineFormat,
  type ListValue,
} from '../markdown'
import type { ToolbarDropdownMenuEntry } from './components/ToolbarDropdown'
import ToolbarIcon, { type ToolbarIconName } from './components/ToolbarIcon'

export const headingLabelKeys: Record<HeadingValue, string> = {
  normal: 'heading.normal',
  h1: 'heading.h1',
  h2: 'heading.h2',
  h3: 'heading.h3',
  h4: 'heading.h4',
  h5: 'heading.h5',
  h6: 'heading.h6',
  blockquote: 'heading.blockquote',
  codeblock: 'heading.codeblock',
}

export const headingItems: ToolbarDropdownMenuEntry[] = [
  { value: 'normal', label: '', shortcut: 'CTRL+N' },
  { value: 'h1', label: '', shortcut: 'CTRL+1' },
  { value: 'h2', label: '', shortcut: 'CTRL+2' },
  { value: 'h3', label: '', shortcut: 'CTRL+3' },
  { id: 'heading-divider-h3', type: 'divider' },
  { value: 'h4', label: '', shortcut: 'CTRL+4' },
  { value: 'h5', label: '', shortcut: 'CTRL+5' },
  { value: 'h6', label: '', shortcut: 'CTRL+6' },
  { id: 'heading-divider-h6', type: 'divider' },
  {
    value: 'blockquote',
    label: '',
    icon: <ToolbarIcon name="blockquote" />,
    submenuId: 'callouts',
  },
  {
    value: 'codeblock',
    label: '',
    icon: <ToolbarIcon name="codeBlock" />,
  },
]

export const listLabelKeys: Record<ListValue, string> = {
  none: 'list.none',
  bullet: 'list.bullet',
  numbered: 'list.numbered',
  checklist: 'list.checklist',
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

type InlineTooltipShortcut = {
  shortcut?: string
}

const inlineTooltipShortcuts: Record<InlineFormat, InlineTooltipShortcut> = {
  bold: { shortcut: 'CTRL + B' },
  italic: { shortcut: 'CTRL + I' },
  underline: { shortcut: 'CTRL + U' },
  strikethrough: { shortcut: 'CTRL + SHIFT + X' },
  code: { shortcut: 'CTRL + E' },
  spoiler: { shortcut: 'CTRL + SHIFT + S' },
  highlight: { shortcut: 'CTRL + SHIFT + H' },
  comment: { shortcut: 'CTRL + /' },
  link: { shortcut: 'CTRL + K' },
  image: { shortcut: 'CTRL + ALT + I' },
  badge: {},
}

const HTML_COMMENT_MARKERS = getInlineFormatMarkers('comment')

export const inlineTooltipLabelKeys: Record<InlineFormat, string> = {
  bold: 'toolbar.bold',
  italic: 'toolbar.italic',
  underline: 'toolbar.underline',
  strikethrough: 'toolbar.strikethrough',
  code: 'toolbar.inlineCode',
  spoiler: 'toolbar.spoiler',
  highlight: 'toolbar.highlight',
  comment: 'toolbar.comment',
  link: 'toolbar.link',
  image: 'toolbar.image',
  badge: 'toolbar.badge',
}

export type ToolbarButtonVisibility = 'primary' | 'extra'

type WrappedInlineToolbarAction = {
  activeFormat: InlineFormat
  command: {
    prefix: string
    suffix?: string
    type: 'wrap'
  }
  icon: ToolbarIconName
  id: InlineFormat
  tooltip: InlineTooltipShortcut
  visibility: ToolbarButtonVisibility
}

type ResourceInlineToolbarAction = {
  activeFormat: Extract<InlineFormat, 'image' | 'link'>
  command: {
    type: Extract<InlineFormat, 'image' | 'link'>
  }
  icon: ToolbarIconName
  id: Extract<InlineFormat, 'image' | 'link'>
  tooltip: InlineTooltipShortcut
  visibility: ToolbarButtonVisibility
}

export type InlineToolbarAction =
  | ResourceInlineToolbarAction
  | WrappedInlineToolbarAction

export const inlineToolbarActions = [
  {
    activeFormat: 'bold',
    command: { prefix: '**', type: 'wrap' },
    icon: 'bold',
    id: 'bold',
    tooltip: inlineTooltipShortcuts.bold,
    visibility: 'primary',
  },
  {
    activeFormat: 'italic',
    command: { prefix: '*', type: 'wrap' },
    icon: 'italic',
    id: 'italic',
    tooltip: inlineTooltipShortcuts.italic,
    visibility: 'primary',
  },
  {
    activeFormat: 'underline',
    command: { prefix: '<u>', suffix: '</u>', type: 'wrap' },
    icon: 'underline',
    id: 'underline',
    tooltip: inlineTooltipShortcuts.underline,
    visibility: 'primary',
  },
  {
    activeFormat: 'strikethrough',
    command: { prefix: '~~', type: 'wrap' },
    icon: 'strikethrough',
    id: 'strikethrough',
    tooltip: inlineTooltipShortcuts.strikethrough,
    visibility: 'primary',
  },
  {
    activeFormat: 'code',
    command: { prefix: '`', type: 'wrap' },
    icon: 'code',
    id: 'code',
    tooltip: inlineTooltipShortcuts.code,
    visibility: 'primary',
  },
  {
    activeFormat: 'link',
    command: { type: 'link' },
    icon: 'link',
    id: 'link',
    tooltip: inlineTooltipShortcuts.link,
    visibility: 'primary',
  },
  {
    activeFormat: 'image',
    command: { type: 'image' },
    icon: 'image',
    id: 'image',
    tooltip: inlineTooltipShortcuts.image,
    visibility: 'primary',
  },
  {
    activeFormat: 'comment',
    command: {
      prefix: HTML_COMMENT_MARKERS.openingMarker,
      suffix: HTML_COMMENT_MARKERS.closingMarker,
      type: 'wrap',
    },
    icon: 'comment',
    id: 'comment',
    tooltip: inlineTooltipShortcuts.comment,
    visibility: 'extra',
  },
  {
    activeFormat: 'spoiler',
    command: { prefix: '||', type: 'wrap' },
    icon: 'spoiler',
    id: 'spoiler',
    tooltip: inlineTooltipShortcuts.spoiler,
    visibility: 'extra',
  },
  {
    activeFormat: 'highlight',
    command: { prefix: '==', type: 'wrap' },
    icon: 'highlight',
    id: 'highlight',
    tooltip: inlineTooltipShortcuts.highlight,
    visibility: 'extra',
  },
  {
    activeFormat: 'badge',
    command: { prefix: '[badge:', suffix: ']', type: 'wrap' },
    icon: 'tag',
    id: 'badge',
    tooltip: inlineTooltipShortcuts.badge,
    visibility: 'extra',
  },
] satisfies InlineToolbarAction[]

export const listItems: ToolbarDropdownMenuEntry[] = [
  { value: 'none', label: '', icon: <ToolbarIcon name="noneList" /> },
  {
    value: 'bullet',
    label: '',
    icon: <ToolbarIcon name="bulletList" />,
  },
  {
    value: 'numbered',
    label: '',
    icon: <ToolbarIcon name="numberedList" />,
  },
  {
    value: 'checklist',
    label: '',
    icon: <ToolbarIcon name="taskList" />,
  },
]
