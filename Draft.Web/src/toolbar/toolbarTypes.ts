import type { RefObject } from 'react'
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import type { FloatingMarkdownToolbarMode } from '../settings/settingsTypes'
import type { ViewMode } from '../workspace/workspaceTypes'
import type { ToolbarTooltipContent } from './components/ToolbarTooltip'
import type { ActiveFormats, HeadingValue, ListValue } from '../markdown'
import type { ToolbarTooltipPlacement } from './components/ToolbarTooltip'

export type DropdownId = 'heading' | 'list'
export type ToolbarSelectionSource = 'editor' | 'preview'

export type ToolbarPosition = {
  left: number
  top: number
}

export type VisibleSelectionPosition = {
  height: number
  left: number
  top: number
}

export type FloatingMarkdownToolbarProps = {
  editor: monaco.editor.IStandaloneCodeEditor | null
  editorBodyRef: RefObject<HTMLDivElement | null>
  onRequestEditorMode: () => void
  previewContentRef: RefObject<HTMLDivElement | null>
  previewScrollElementRef: RefObject<HTMLDivElement | null>
  toolbarMode: FloatingMarkdownToolbarMode
  viewMode: ViewMode
  workspaceRef: RefObject<HTMLElement | null>
}

export type PreviewSelectionSnapshot = {
  anchorRect: DOMRect
  endOffset: number
  selection: monaco.Selection
  sourceKey: string
  startOffset: number
}

export type ToolbarTooltipPosition = {
  arrowLeft: number
  left: number
  placement: ToolbarTooltipPlacement
  top: number
}

export type ActiveToolbarTooltip = ToolbarTooltipContent &
  ToolbarTooltipPosition & {
    visible: boolean
  }

export type ToolbarStateSnapshot = {
  activeFormats: ActiveFormats
  headingValue: HeadingValue
  listValue: ListValue
}
