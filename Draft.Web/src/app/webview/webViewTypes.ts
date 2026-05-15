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

declare global {
  interface Window {
    setDraftViewMode?: (mode: ViewMode) => void
    chrome?: {
      webview?: DraftWebView
    }
  }
}
