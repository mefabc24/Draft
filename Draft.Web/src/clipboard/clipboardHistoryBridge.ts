import { postClipboardTextCopied } from '../app/webview/draftWebViewMessages'

export function postCopiedPlainTextToHostClipboard(text: string) {
  if (text.length === 0) {
    return
  }

  window.setTimeout(() => {
    postClipboardTextCopied(text)
  }, 0)
}
