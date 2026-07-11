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
    submenuId: 'callouts',
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
  highlight: { label: 'Highlight', shortcut: 'CTRL + SHIFT + H' },
  comment: { label: 'Comment', shortcut: 'CTRL + /' },
  link: { label: 'Link', shortcut: 'CTRL + K' },
  image: { label: 'Image', shortcut: 'CTRL + ALT + I' },
  badge: { label: 'Badge' },
}

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
  ariaLabel: string
  command: {
    prefix: string
    suffix?: string
    type: 'wrap'
  }
  icon: ToolbarIconName
  id: InlineFormat
  tooltip: ToolbarTooltipContent
  visibility: ToolbarButtonVisibility
}

type ResourceInlineToolbarAction = {
  activeFormat: Extract<InlineFormat, 'image' | 'link'>
  ariaLabel: string
  command: {
    type: Extract<InlineFormat, 'image' | 'link'>
  }
  icon: ToolbarIconName
  id: Extract<InlineFormat, 'image' | 'link'>
  tooltip: ToolbarTooltipContent
  visibility: ToolbarButtonVisibility
}

export type InlineToolbarAction =
  | ResourceInlineToolbarAction
  | WrappedInlineToolbarAction

export const inlineToolbarActions = [
  {
    activeFormat: 'bold',
    ariaLabel: 'Bold',
    command: { prefix: '**', type: 'wrap' },
    icon: 'bold',
    id: 'bold',
    tooltip: inlineTooltips.bold,
    visibility: 'primary',
  },
  {
    activeFormat: 'italic',
    ariaLabel: 'Italic',
    command: { prefix: '*', type: 'wrap' },
    icon: 'italic',
    id: 'italic',
    tooltip: inlineTooltips.italic,
    visibility: 'primary',
  },
  {
    activeFormat: 'underline',
    ariaLabel: 'Underline',
    command: { prefix: '<u>', suffix: '</u>', type: 'wrap' },
    icon: 'underline',
    id: 'underline',
    tooltip: inlineTooltips.underline,
    visibility: 'primary',
  },
  {
    activeFormat: 'strikethrough',
    ariaLabel: 'Strikethrough',
    command: { prefix: '~~', type: 'wrap' },
    icon: 'strikethrough',
    id: 'strikethrough',
    tooltip: inlineTooltips.strikethrough,
    visibility: 'primary',
  },
  {
    activeFormat: 'code',
    ariaLabel: 'Inline code',
    command: { prefix: '`', type: 'wrap' },
    icon: 'code',
    id: 'code',
    tooltip: inlineTooltips.code,
    visibility: 'primary',
  },
  {
    activeFormat: 'link',
    ariaLabel: 'Link',
    command: { type: 'link' },
    icon: 'link',
    id: 'link',
    tooltip: inlineTooltips.link,
    visibility: 'primary',
  },
  {
    activeFormat: 'image',
    ariaLabel: 'Image',
    command: { type: 'image' },
    icon: 'image',
    id: 'image',
    tooltip: inlineTooltips.image,
    visibility: 'primary',
  },
  {
    activeFormat: 'comment',
    ariaLabel: 'Comment',
    command: { prefix: '%%', type: 'wrap' },
    icon: 'comment',
    id: 'comment',
    tooltip: inlineTooltips.comment,
    visibility: 'extra',
  },
  {
    activeFormat: 'spoiler',
    ariaLabel: 'Spoiler',
    command: { prefix: '||', type: 'wrap' },
    icon: 'spoiler',
    id: 'spoiler',
    tooltip: inlineTooltips.spoiler,
    visibility: 'extra',
  },
  {
    activeFormat: 'highlight',
    ariaLabel: 'Highlight',
    command: { prefix: '==', type: 'wrap' },
    icon: 'highlight',
    id: 'highlight',
    tooltip: inlineTooltips.highlight,
    visibility: 'extra',
  },
  {
    activeFormat: 'badge',
    ariaLabel: 'Badge',
    command: { prefix: '[badge:', suffix: ']', type: 'wrap' },
    icon: 'tag',
    id: 'badge',
    tooltip: inlineTooltips.badge,
    visibility: 'extra',
  },
] satisfies InlineToolbarAction[]

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
