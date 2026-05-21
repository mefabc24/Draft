import { readRecordValue } from '../../settings/settingsMessageParser'
import { isViewMode, type ViewMode } from '../../workspace/workspaceTypes'
import { postWebViewMessage } from './draftWebViewBridge'

export const DEFAULT_FILE_NAME = 'untitled.md'

const WORKSPACE_MODE_MESSAGE_TYPE = 'workspaceModeChanged'
const LOAD_DOCUMENT_MESSAGE_TYPE = 'loadDocument'
const GO_TO_POSITION_MESSAGE_TYPE = 'goToPosition'
const DOCUMENT_CHANGED_MESSAGE_TYPE = 'documentChanged'
const CURSOR_POSITION_CHANGED_MESSAGE_TYPE = 'cursorPositionChanged'
const SAVE_REQUESTED_MESSAGE_TYPE = 'saveRequested'
const OPEN_EXTERNAL_URL_MESSAGE_TYPE = 'openExternalUrl'

export type WorkspaceModeMessage = {
  type: 'workspaceModeChanged'
  mode: ViewMode
}

export type LoadDocumentMessage = {
  type: 'loadDocument'
  content: string
  fileName: string
}

export type GoToPositionMessage = {
  type: 'goToPosition'
  line: number
  column: number
}

export function parseWebViewRecord(data: unknown): Record<string, unknown> | null {
  let message = data

  if (typeof message === 'string') {
    try {
      message = JSON.parse(message) as unknown
    } catch {
      return null
    }
  }

  if (!message || typeof message !== 'object') {
    return null
  }

  return message as Record<string, unknown>
}

export function parseWorkspaceModeMessage(
  record: Record<string, unknown>,
): WorkspaceModeMessage | null {
  const type = record.type ?? record.Type
  const mode = record.mode ?? record.Mode

  if (
    type !== WORKSPACE_MODE_MESSAGE_TYPE ||
    typeof mode !== 'string' ||
    !isViewMode(mode)
  ) {
    return null
  }

  return {
    type: WORKSPACE_MODE_MESSAGE_TYPE,
    mode,
  }
}

export function parseLoadDocumentMessage(
  record: Record<string, unknown>,
): LoadDocumentMessage | null {
  const type = record.type ?? record.Type
  const content = record.content ?? record.Content
  const fileName = record.fileName ?? record.FileName

  if (
    type !== LOAD_DOCUMENT_MESSAGE_TYPE ||
    typeof content !== 'string' ||
    typeof fileName !== 'string'
  ) {
    return null
  }

  return {
    type: LOAD_DOCUMENT_MESSAGE_TYPE,
    content,
    fileName: fileName.trim() || DEFAULT_FILE_NAME,
  }
}

export function parseGoToPositionMessage(
  record: Record<string, unknown>,
): GoToPositionMessage | null {
  const type = record.type ?? record.Type
  const line = readRecordValue(record, 'line')
  const column = readRecordValue(record, 'column')

  if (
    type !== GO_TO_POSITION_MESSAGE_TYPE ||
    typeof line !== 'number' ||
    typeof column !== 'number' ||
    !Number.isFinite(line) ||
    !Number.isFinite(column) ||
    line < 1 ||
    column < 1
  ) {
    return null
  }

  return {
    type: GO_TO_POSITION_MESSAGE_TYPE,
    line: Math.trunc(line),
    column: Math.trunc(column),
  }
}

export function postWorkspaceMode(mode: ViewMode) {
  postWebViewMessage({
    type: WORKSPACE_MODE_MESSAGE_TYPE,
    mode,
  })
}

export function postDocumentChanged(content: string) {
  postWebViewMessage({
    type: DOCUMENT_CHANGED_MESSAGE_TYPE,
    content,
  })
}

export function postCursorPositionChanged(message: {
  column: number
  line: number
  selectedCharacterCount: number
}) {
  postWebViewMessage({
    type: CURSOR_POSITION_CHANGED_MESSAGE_TYPE,
    ...message,
  })
}

export function postSaveRequested() {
  postWebViewMessage({
    type: SAVE_REQUESTED_MESSAGE_TYPE,
  })
}

export function postOpenExternalUrl(url: string) {
  postWebViewMessage({
    type: OPEN_EXTERNAL_URL_MESSAGE_TYPE,
    url,
  })
}
