import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { LocalizationProvider } from '../localization/LocalizationProvider'
import {
  getCurrentAppLanguage,
  translate,
} from '../localization/localization'
import PreviewMarkdownRenderer from '../preview/components/PreviewMarkdownRenderer'
import { getPreviewThemeStyle } from '../themes'
import type { DraftPreviewTheme } from '../themes/preview/support/previewThemeTypes'

const exportRenderTimeoutMilliseconds = 15000
const exportRenderPendingSelector = '[data-preview-export-render-pending]'

function applyPreviewThemeStyle(
  element: HTMLElement,
  previewTheme: DraftPreviewTheme,
) {
  for (const [name, value] of Object.entries(getPreviewThemeStyle(previewTheme))) {
    element.style.setProperty(name, String(value))
  }
}

function waitForPreviewRender(contentElement: HTMLElement) {
  return new Promise<void>((resolve, reject) => {
    const observer = new MutationObserver(completeWhenReady)
    const timeoutId = window.setTimeout(() => {
      observer.disconnect()
      reject(new Error(translate('export.previewContentNotReady')))
    }, exportRenderTimeoutMilliseconds)

    function completeWhenReady() {
      if (contentElement.querySelector(exportRenderPendingSelector)) {
        return
      }

      window.clearTimeout(timeoutId)
      observer.disconnect()
      resolve()
    }

    observer.observe(contentElement, {
      childList: true,
      subtree: true,
    })
    completeWhenReady()
  })
}

export async function renderPreviewExportContent(
  markdown: string,
  previewTheme: DraftPreviewTheme,
) {
  const renderHost = document.createElement('div')
  const contentElement = document.createElement('div')

  renderHost.className = 'preview-pane preview-export-render-host'
  renderHost.setAttribute('aria-hidden', 'true')
  renderHost.style.position = 'fixed'
  renderHost.style.top = '0'
  renderHost.style.left = '-100000px'
  renderHost.style.width = '1016px'
  renderHost.style.visibility = 'hidden'
  renderHost.style.pointerEvents = 'none'
  applyPreviewThemeStyle(renderHost, previewTheme)

  contentElement.className = 'preview-content'
  renderHost.append(contentElement)
  document.body.append(renderHost)

  const root = createRoot(contentElement)

  try {
    flushSync(() => {
      root.render(
        <LocalizationProvider language={getCurrentAppLanguage()}>
          <PreviewMarkdownRenderer
            fallback={<span data-preview-export-render-pending="" />}
            markdown={markdown}
            previewTheme={previewTheme}
          />
        </LocalizationProvider>,
      )
    })

    await waitForPreviewRender(contentElement)
    return contentElement.cloneNode(true) as HTMLElement
  } finally {
    root.unmount()
    renderHost.remove()
  }
}
