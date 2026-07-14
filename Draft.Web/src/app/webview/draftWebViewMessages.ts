import {
  parseDraftEditorSettings,
  readRecordValue,
} from '../../settings/settingsMessageParser'
import type { DraftEditorSettings } from '../../settings/settingsTypes'
import { isViewMode, type ViewMode } from '../../workspace/workspaceTypes'
import { postWebViewMessage } from './draftWebViewBridge'

export const DEFAULT_FILE_NAME = 'untitled.md'

const WORKSPACE_MODE_MESSAGE_TYPE = 'workspaceModeChanged'
const WORKSPACE_READY_MESSAGE_TYPE = 'workspaceReady'
const STARTUP_STATE_MESSAGE_TYPE = 'startupState'
const STARTUP_STATE_APPLIED_MESSAGE_TYPE = 'startupStateApplied'
const LOAD_DOCUMENT_MESSAGE_TYPE = 'loadDocument'
const GO_TO_POSITION_MESSAGE_TYPE = 'goToPosition'
const DOCUMENT_CHANGED_MESSAGE_TYPE = 'documentChanged'
const CURSOR_POSITION_CHANGED_MESSAGE_TYPE = 'cursorPositionChanged'
const CLIPBOARD_TEXT_COPIED_MESSAGE_TYPE = 'clipboardTextCopied'
const SAVE_REQUESTED_MESSAGE_TYPE = 'saveRequested'
const OPEN_REQUESTED_MESSAGE_TYPE = 'openRequested'
const OPEN_EXTERNAL_URL_MESSAGE_TYPE = 'openExternalUrl'

export type WorkspaceModeMessage = {
  type: 'workspaceModeChanged'
  mode: ViewMode
}

export type LoadDocumentMessage = {
  type: 'loadDocument'
  content: string
  fileName: string
  filePath: string | null
  isUntitled: boolean
  documentGeneration: number | null
}

export type StartupDocumentState = {
  content: string
  displayFileName: string
  filePath: string | null
  isUntitled: boolean
  isModified: boolean
}

export type StartupStateMessage = {
  type: 'startupState'
  document: StartupDocumentState
  workspaceMode: ViewMode
  documentGeneration: number
  settings: DraftEditorSettings
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object'
    ? value as Record<string, unknown>
    : null
}

function readOptionalString(
  record: Record<string, unknown>,
  name: string,
): string | null {
  const value = readRecordValue(record, name)
  return typeof value === 'string' ? value : null
}

function readOptionalGeneration(
  record: Record<string, unknown>,
  name: string,
) {
  const value = readRecordValue(record, name)
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.trunc(value)
    : null
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
  const filePath = readOptionalString(record, 'filePath')
  const isUntitled = readRecordValue(record, 'isUntitled')
  const documentGeneration = readOptionalGeneration(record, 'documentGeneration')

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
    filePath,
    isUntitled: typeof isUntitled === 'boolean' ? isUntitled : filePath === null,
    documentGeneration,
  }
}

export function parseStartupStateMessage(
  record: Record<string, unknown>,
): StartupStateMessage | null {
  const type = record.type ?? record.Type
  const documentRecord = asRecord(readRecordValue(record, 'document'))
  const settingsRecord = asRecord(readRecordValue(record, 'settings'))
  const workspaceMode = readRecordValue(record, 'workspaceMode')
  const documentGeneration = readOptionalGeneration(record, 'documentGeneration')

  if (
    type !== STARTUP_STATE_MESSAGE_TYPE ||
    !documentRecord ||
    !settingsRecord ||
    typeof workspaceMode !== 'string' ||
    !isViewMode(workspaceMode) ||
    documentGeneration === null
  ) {
    return null
  }

  const content = readRecordValue(documentRecord, 'content')
  const displayFileName = readRecordValue(documentRecord, 'displayFileName')
  const filePath = readOptionalString(documentRecord, 'filePath')
  const isUntitled = readRecordValue(documentRecord, 'isUntitled')
  const isModified = readRecordValue(documentRecord, 'isModified')

  if (
    typeof content !== 'string' ||
    typeof displayFileName !== 'string' ||
    typeof isUntitled !== 'boolean' ||
    typeof isModified !== 'boolean'
  ) {
    return null
  }

  return {
    type: STARTUP_STATE_MESSAGE_TYPE,
    document: {
      content,
      displayFileName: displayFileName.trim() || DEFAULT_FILE_NAME,
      filePath,
      isUntitled,
      isModified,
    },
    workspaceMode,
    documentGeneration,
    settings: parseDraftEditorSettings(settingsRecord),
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

export function postWorkspaceReady() {
  postWebViewMessage({
    type: WORKSPACE_READY_MESSAGE_TYPE,
  })
}

export function postStartupStateApplied(documentGeneration: number) {
  postWebViewMessage({
    type: STARTUP_STATE_APPLIED_MESSAGE_TYPE,
    documentGeneration,
  })
}

export function postDocumentChanged(
  content: string,
  documentGeneration: number | null,
) {
  const message: {
    type: typeof DOCUMENT_CHANGED_MESSAGE_TYPE
    content: string
    documentGeneration?: number
  } = {
    type: DOCUMENT_CHANGED_MESSAGE_TYPE,
    content,
  }

  if (documentGeneration !== null && documentGeneration > 0) {
    message.documentGeneration = documentGeneration
  }

  postWebViewMessage(message)
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

export function postClipboardTextCopied(text: string) {
  postWebViewMessage({
    type: CLIPBOARD_TEXT_COPIED_MESSAGE_TYPE,
    text,
  })
}

export function postSaveRequested() {
  postWebViewMessage({
    type: SAVE_REQUESTED_MESSAGE_TYPE,
  })
}

export function postOpenRequested() {
  postWebViewMessage({
    type: OPEN_REQUESTED_MESSAGE_TYPE,
  })
}

export function postOpenExternalUrl(url: string) {
  postWebViewMessage({
    type: OPEN_EXTERNAL_URL_MESSAGE_TYPE,
    url,
  })
}
