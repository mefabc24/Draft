import type { ViewMode } from '../../workspace/workspaceTypes'

export type WebViewMessageEvent = Event & { data: unknown }

export type DraftWebView = {
  addEventListener: (
    type: 'message',
    listener: (event: WebViewMessageEvent) => void,
  ) => void
  removeEventListener: (
    type: 'message',
    listener: (event: WebViewMessageEvent) => void,
  ) => void
  postMessage: (message: string) => void
}

export type DraftPreviewExportOptions = {
  layout?: 'html' | 'pdf' | 'png'
}

export type DraftExportApi = {
  createPreviewHtml: (options?: DraftPreviewExportOptions) => string
}

declare global {
  interface Window {
    draftExport?: DraftExportApi
    setDraftViewMode?: (mode: ViewMode) => void
    chrome?: {
      webview?: DraftWebView
    }
  }
}
