import type { ViewMode } from '../../workspace/workspaceTypes'
import type {
  DraftPreviewExportOptions,
  WebViewMessageEvent,
} from './webViewTypes'

export function addWebViewMessageListener(
  listener: (event: WebViewMessageEvent) => void,
) {
  const webview = window.chrome?.webview

  if (!webview) {
    return () => {}
  }

  webview.addEventListener('message', listener)

  return () => {
    webview.removeEventListener('message', listener)
  }
}

export function setDraftViewModeHandler(handler: (mode: ViewMode) => void) {
  window.setDraftViewMode = handler

  return () => {
    window.setDraftViewMode = undefined
  }
}

export function setPreviewExportHtmlHandler(
  handler: (options?: DraftPreviewExportOptions) => string,
) {
  window.draftExport = {
    createPreviewHtml: handler,
  }

  return () => {
    window.draftExport = undefined
  }
}

export function postWebViewMessage(message: unknown) {
  window.chrome?.webview?.postMessage(JSON.stringify(message))
}
