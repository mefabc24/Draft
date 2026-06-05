type PreviewExportOptions = {
  fileName: string
  layout?: 'html' | 'pdf'
}

const cssUrlPattern = /url\((['"]?)(?!data:|blob:|https?:|file:|#)([^'")]+)\1\)/gu
const embeddedSvgAssetUrls = new Map<string, string | null>()

function escapeHtml(value: string) {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;')
}

function getDocumentTitle(fileName: string) {
  const trimmedFileName = fileName.trim()

  if (!trimmedFileName) {
    return 'Draft Export'
  }

  const extensionIndex = trimmedFileName.lastIndexOf('.')

  return extensionIndex > 0
    ? trimmedFileName.slice(0, extensionIndex)
    : trimmedFileName
}

function shouldIncludeCssRule(cssText: string) {
  const normalizedCssText = cssText.trim()

  return normalizedCssText.startsWith('*')
    || normalizedCssText.startsWith(':root')
    || normalizedCssText.startsWith('html')
    || normalizedCssText.startsWith('body')
    || normalizedCssText.startsWith('@font-face')
    || normalizedCssText.includes('.preview-')
    || normalizedCssText.includes('[data-rehype-pretty-code')
}

function resolveCssUrls(cssText: string) {
  return cssText.replace(cssUrlPattern, (_match, _quote, path: string) => {
    try {
      return `url("${new URL(path, document.baseURI).href}")`
    } catch {
      return `url("${path}")`
    }
  })
}

function tryReadSvgAssetAsDataUrl(assetUrl: string) {
  if (embeddedSvgAssetUrls.has(assetUrl)) {
    return embeddedSvgAssetUrls.get(assetUrl)
  }

  try {
    const request = new XMLHttpRequest()
    request.open('GET', assetUrl, false)
    request.send()

    if (request.status >= 200 && request.status < 300) {
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(request.responseText)}`
      embeddedSvgAssetUrls.set(assetUrl, dataUrl)
      return dataUrl
    }
  } catch {
    // If an asset cannot be embedded, keep the resolved URL as a safe fallback.
  }

  embeddedSvgAssetUrls.set(assetUrl, null)
  return null
}

function resolveInlineStyleUrls(styleText: string) {
  return styleText.replace(cssUrlPattern, (_match, _quote, path: string) => {
    let assetUrl = path

    try {
      assetUrl = new URL(path, document.baseURI).href
    } catch {
      return `url("${path}")`
    }

    if (assetUrl.includes('/icons/') && assetUrl.endsWith('.svg')) {
      const dataUrl = tryReadSvgAssetAsDataUrl(assetUrl)

      if (dataUrl) {
        return `url("${dataUrl}")`
      }
    }

    return `url("${assetUrl}")`
  })
}

function getPdfExportCss() {
  return `
@page {
  margin: 0;
  background: var(--preview-background);
}

html,
body {
  width: 100%;
  min-height: 100%;
  margin: 0;
  background: var(--preview-background) !important;
  color: var(--preview-foreground);
}

body {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.draft-pdf-export.preview-pane {
  width: 100%;
  min-width: 100%;
  min-height: 100vh;
  background: var(--preview-background);
  color: var(--preview-foreground);
  overflow: visible;
}

.draft-pdf-export .preview-scroll {
  box-sizing: border-box;
  width: 100%;
  height: auto;
  min-height: 100vh;
  overflow: visible;
  padding: 32px;
}

.draft-pdf-export .preview-content {
  width: 100%;
  max-width: none;
  min-height: 0;
  margin: 0;
}

.draft-pdf-export .preview-content img {
  max-width: 100%;
  max-height: none;
}

@media print {
  html,
  body,
  .draft-pdf-export.preview-pane {
    width: 100%;
    min-height: 100%;
    background: var(--preview-background) !important;
  }

  .draft-pdf-export .preview-scroll {
    min-height: 100%;
    padding: 32px;
  }

  .draft-pdf-export .preview-content {
    width: 100%;
    max-width: none;
    margin: 0;
  }

  .draft-pdf-export .preview-content table {
    width: 100%;
    max-width: 100%;
  }

  .draft-pdf-export .preview-content pre {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
}
`
}

function getExportCss(layout: PreviewExportOptions['layout']) {
  const cssRules: string[] = []

  for (const styleSheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(styleSheet.cssRules)) {
        const cssText = rule.cssText

        if (shouldIncludeCssRule(cssText)) {
          cssRules.push(resolveCssUrls(cssText))
        }
      }
    } catch {
      // Cross-origin stylesheets are ignored. Draft's own preview CSS is same-origin.
    }
  }

  cssRules.push(`
html,
body {
  min-height: 100%;
}

body {
  margin: 0;
  background: var(--preview-background);
  color: var(--preview-foreground);
}

.draft-export-preview.preview-pane {
  min-height: 100vh;
  overflow: visible;
}

.draft-export-preview .preview-scroll {
  width: 100%;
  height: auto;
  min-height: 100vh;
  overflow: visible;
  padding: 48px;
  scrollbar-width: auto;
}

.draft-export-preview .preview-content {
  width: min(100%, 920px);
  min-height: 0;
  margin: 0 auto;
}

.draft-export-preview .preview-code-block-copy-button,
.draft-export-preview .preview-scrollbar {
  display: none !important;
}

@media print {
  @page {
    margin: 0.45in;
  }

  html,
  body,
  .draft-export-preview.preview-pane {
    min-height: auto;
  }

  .draft-export-preview .preview-scroll {
    min-height: auto;
    padding: 0;
  }

  .draft-export-preview .preview-content {
    width: 100%;
    max-width: none;
  }

  .preview-content pre {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
}
`)

  if (layout === 'pdf') {
    cssRules.push(getPdfExportCss())
  }

  return cssRules.join('\n\n')
}

function removeExportOnlyUi(previewContent: HTMLElement) {
  const exportOnlyUiSelector = [
    '.preview-code-block-copy-button',
    '.preview-scrollbar',
    '[data-preview-edit-menu]',
  ].join(', ')

  for (const element of Array.from(previewContent.querySelectorAll(exportOnlyUiSelector))) {
    element.remove()
  }
}

function removeSourceMappingAttributes(previewContent: HTMLElement) {
  for (const element of Array.from(previewContent.querySelectorAll<HTMLElement>('*'))) {
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name.startsWith('data-source')) {
        element.removeAttribute(attribute.name)
      }
    }
  }
}

function resolveElementStyleUrls(previewContent: HTMLElement) {
  for (const element of Array.from(previewContent.querySelectorAll<HTMLElement>('[style]'))) {
    const styleText = element.getAttribute('style')

    if (styleText) {
      element.setAttribute('style', resolveInlineStyleUrls(styleText))
    }
  }
}

function clonePreviewContent() {
  const previewContent = document.querySelector<HTMLElement>('.preview-content')

  if (!previewContent) {
    throw new Error('Preview content is not ready.')
  }

  const clonedPreviewContent = previewContent.cloneNode(true) as HTMLElement

  removeExportOnlyUi(clonedPreviewContent)
  removeSourceMappingAttributes(clonedPreviewContent)
  resolveElementStyleUrls(clonedPreviewContent)

  return clonedPreviewContent.innerHTML
}

function getPreviewThemeStyleAttribute() {
  const previewPane = document.querySelector<HTMLElement>('.preview-pane')

  return previewPane?.getAttribute('style') ?? ''
}

export function createPreviewExportHtml({
  fileName,
  layout = 'html',
}: PreviewExportOptions) {
  const title = getDocumentTitle(fileName)
  const themeStyle = getPreviewThemeStyleAttribute()
  const escapedThemeStyle = escapeHtml(themeStyle)
  const previewHtml = clonePreviewContent()
  const css = getExportCss(layout)
  const htmlStyleAttribute = layout === 'pdf' ? ` style="${escapedThemeStyle}"` : ''
  const bodyClassAttribute = layout === 'pdf' ? ' class="draft-pdf-export-body"' : ''
  const exportRootClass = layout === 'pdf'
    ? 'draft-export-preview draft-pdf-export preview-pane'
    : 'draft-export-preview preview-pane'

  return `<!doctype html>
<html lang="en"${htmlStyleAttribute}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
${css}
  </style>
</head>
<body${bodyClassAttribute} style="${escapedThemeStyle}">
  <main class="${exportRootClass}" style="${escapedThemeStyle}">
    <div class="preview-scroll">
      <div class="preview-content">
${previewHtml}
      </div>
    </div>
  </main>
</body>
</html>`
}
