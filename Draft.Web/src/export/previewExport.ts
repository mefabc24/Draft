type PreviewExportOptions = {
  fileName: string
  layout?: 'html' | 'pdf'
}

const pdfPageWidthInches = 8.5
const pdfPageHeightInches = 11
const cssPixelsPerInch = 96
const pdfPageWidthCssPixels = pdfPageWidthInches * cssPixelsPerInch
const pdfPageHeightCssPixels = pdfPageHeightInches * cssPixelsPerInch
const pdfPagePaddingCssPixels = 32
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
  size: ${pdfPageWidthInches}in ${pdfPageHeightInches}in;
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
  padding: ${pdfPagePaddingCssPixels}px;
}

.draft-pdf-export .preview-content {
  width: 100%;
  max-width: none;
  min-height: 0;
  margin: 0;
  orphans: 3;
  widows: 3;
}

.draft-pdf-export .preview-content img {
  max-width: 100%;
  max-height: none;
}

.draft-pdf-export .preview-content :is(
  p,
  blockquote,
  figure,
  pre,
  table,
  tr,
  img,
  hr,
  li,
  .preview-code-block,
  .preview-callout,
  [data-rehype-pretty-code-figure]
) {
  break-inside: avoid;
  break-inside: avoid-page;
  page-break-inside: avoid;
  -webkit-column-break-inside: avoid;
}

.draft-pdf-export .preview-content :is(
  blockquote,
  pre,
  table,
  .preview-code-block,
  .preview-callout,
  [data-rehype-pretty-code-figure]
) {
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

.draft-pdf-export .preview-content :is(
  h1,
  h2,
  h3,
  h4,
  h5,
  h6
) {
  break-inside: avoid;
  break-inside: avoid-page;
  break-after: avoid;
  break-after: avoid-page;
  page-break-inside: avoid;
  page-break-after: avoid;
}

.draft-pdf-page-spacer,
.draft-pdf-line-spacer {
  display: block !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  flex: 0 0 auto !important;
  pointer-events: none !important;
}

.draft-pdf-line-spacer {
  font-size: 0 !important;
  line-height: 0 !important;
}

.draft-pdf-inline-fragment {
  display: inline !important;
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
    padding: ${pdfPagePaddingCssPixels}px;
  }

  .draft-pdf-export .preview-content {
    width: 100%;
    max-width: none;
    margin: 0;
    orphans: 3;
    widows: 3;
  }

  .draft-pdf-export .preview-content :is(
    p,
    blockquote,
    figure,
    pre,
    table,
    tr,
    img,
    hr,
    li,
    .preview-code-block,
    .preview-callout,
    [data-rehype-pretty-code-figure]
  ) {
    break-inside: avoid;
    break-inside: avoid-page;
    page-break-inside: avoid;
    -webkit-column-break-inside: avoid;
  }

  .draft-pdf-export .preview-content :is(
    blockquote,
    pre,
    table,
    .preview-code-block,
    .preview-callout,
    [data-rehype-pretty-code-figure]
  ) {
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
  }

  .draft-pdf-export .preview-content :is(
    h1,
    h2,
    h3,
    h4,
    h5,
    h6
  ) {
    break-inside: avoid;
    break-inside: avoid-page;
    break-after: avoid;
    break-after: avoid-page;
    page-break-inside: avoid;
    page-break-after: avoid;
  }

  .draft-pdf-export .preview-content table {
    width: 100%;
    max-width: 100%;
  }

  .draft-pdf-export .preview-content pre {
    overflow: visible;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .draft-pdf-export .preview-content pre code [data-line],
  .draft-pdf-export .preview-content pre code > span {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
`
}

function getPdfExportScript() {
  return `
<script>
(() => {
  const PAGE_WIDTH = ${pdfPageWidthCssPixels};
  const PAGE_HEIGHT = ${pdfPageHeightCssPixels};
  const PAGE_PADDING = ${pdfPagePaddingCssPixels};
  const PAGE_SAFETY = 10;
  const MAX_PASSES = 8;
  const MIN_SPACER_HEIGHT = 1;
  const MAX_KEEP_TOGETHER_HEIGHT = PAGE_HEIGHT - PAGE_PADDING * 2 - PAGE_SAFETY * 2;
  const PAGE_SPACER_CLASS = 'draft-pdf-page-spacer';
  const LINE_SPACER_CLASS = 'draft-pdf-line-spacer';
  const INLINE_FRAGMENT_CLASS = 'draft-pdf-inline-fragment';
  const KEEP_SELECTOR = [
    '.preview-content > p',
    '.preview-content > blockquote',
    '.preview-content > figure',
    '.preview-content > table',
    '.preview-content > ul',
    '.preview-content > ol',
    '.preview-content > pre',
    '.preview-content > hr',
    '.preview-content > .preview-code-block',
    '.preview-content > [data-rehype-pretty-code-figure]',
    '.preview-content li',
    '.preview-content blockquote.preview-callout',
    '.preview-content figure[data-rehype-pretty-code-figure]',
    '.preview-content .preview-code-block',
    '.preview-content h1',
    '.preview-content h2',
    '.preview-content h3',
    '.preview-content h4',
    '.preview-content h5',
    '.preview-content h6'
  ].join(',');
  const HEADING_SELECTOR = 'h1,h2,h3,h4,h5,h6';
  const INLINE_CONTAINER_SELECTOR = [
    '.preview-content p',
    '.preview-content li',
    '.preview-content blockquote',
    '.preview-content .preview-callout-body'
  ].join(',');
  const INLINE_SKIP_SELECTOR = [
    'pre',
    'table',
    '.preview-code-block',
    '[data-rehype-pretty-code-figure]',
    'script',
    'style'
  ].join(',');
  const INLINE_ATOMIC_SELECTOR = [
    '.preview-content :not(pre) > code',
    '.preview-content .preview-tag',
    '.preview-content .preview-badge',
    '.preview-content .preview-highlight',
    '.preview-content .preview-spoiler'
  ].join(',');

  function nextFrame() {
    return new Promise((resolve) => {
      let didResolve = false;
      const finish = () => {
        if (didResolve) {
          return;
        }

        didResolve = true;
        resolve();
      };

      window.setTimeout(finish, 25);

      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(finish);
        });
      }
    });
  }

  function waitForImages() {
    const images = Array.from(document.images);

    return Promise.all(images.map((image) => {
      if (image.complete) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        const timeoutId = window.setTimeout(resolve, 2000);
        const finish = () => {
          window.clearTimeout(timeoutId);
          resolve();
        };

        image.addEventListener('load', finish, { once: true });
        image.addEventListener('error', finish, { once: true });
      });
    }));
  }

  function getDocumentRect(element) {
    const rect = element.getBoundingClientRect();
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;

    return {
      top: rect.top + scrollY,
      bottom: rect.bottom + scrollY,
      height: rect.height,
      width: rect.width
    };
  }

  function isVisibleElement(element) {
    const rect = getDocumentRect(element);

    return rect.height > 0 && rect.width > 0;
  }

  function getPageBottom(y) {
    return Math.floor(y / PAGE_HEIGHT) * PAGE_HEIGHT + PAGE_HEIGHT;
  }

  function getSafePageBottom(y) {
    return getPageBottom(y) - PAGE_PADDING - PAGE_SAFETY;
  }

  function getNextPageContentTop(y) {
    return getPageBottom(y) + PAGE_PADDING;
  }

  function crossesPageBoundary(top, bottom) {
    const safePageBottom = getSafePageBottom(top);

    return top < safePageBottom && bottom > safePageBottom;
  }

  function getSpacerHeightToNextPage(top) {
    return Math.ceil(getNextPageContentTop(top) - top);
  }

  function getPreviousSpacer(element, spacerClassName) {
    const previousElement = element.previousElementSibling;

    if (
      previousElement instanceof HTMLElement &&
      previousElement.dataset.draftPdfSpacer === 'true' &&
      previousElement.classList.contains(spacerClassName)
    ) {
      return previousElement;
    }

    return null;
  }

  function ensureSpacerBefore(element, spacerClassName, height) {
    const roundedHeight = Math.ceil(height);

    if (roundedHeight < MIN_SPACER_HEIGHT) {
      return false;
    }

    const existingSpacer = getPreviousSpacer(element, spacerClassName);

    if (existingSpacer) {
      const currentHeight = Number.parseFloat(existingSpacer.style.height) || 0;

      if (currentHeight >= roundedHeight - 0.5) {
        return false;
      }

      existingSpacer.style.height = roundedHeight + 'px';
      return true;
    }

    const spacer = document.createElement('span');
    spacer.className = spacerClassName;
    spacer.dataset.draftPdfSpacer = 'true';
    spacer.setAttribute('aria-hidden', 'true');
    spacer.style.height = roundedHeight + 'px';
    element.before(spacer);

    return true;
  }

  function removeSpacers() {
    document
      .querySelectorAll('[data-draft-pdf-spacer="true"]')
      .forEach((spacer) => spacer.remove());
  }

  function wrapInlineTextFragments(content) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      content,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const text = node.nodeValue || '';
          const parentElement = node.parentElement;

          if (!text.trim() ||
              !parentElement ||
              parentElement.closest(INLINE_SKIP_SELECTOR) ||
              parentElement.closest(INLINE_ATOMIC_SELECTOR) ||
              parentElement.closest('.' + INLINE_FRAGMENT_CLASS) ||
              !parentElement.closest(INLINE_CONTAINER_SELECTOR)) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let currentNode = walker.nextNode();

    while (currentNode) {
      textNodes.push(currentNode);
      currentNode = walker.nextNode();
    }

    for (const textNode of textNodes) {
      const text = textNode.nodeValue || '';
      const fragment = document.createDocumentFragment();
      const segments = text.match(/\\s+|\\S+\\s*/gu) || [text];

      for (const segment of segments) {
        if (!segment.trim()) {
          fragment.append(document.createTextNode(segment));
          continue;
        }

        const span = document.createElement('span');
        span.className = INLINE_FRAGMENT_CLASS;
        span.textContent = segment;
        fragment.append(span);
      }

      textNode.replaceWith(fragment);
    }
  }

  function isKeepTogetherElement(element) {
    return isVisibleElement(element) &&
      getDocumentRect(element).height <= MAX_KEEP_TOGETHER_HEIGHT;
  }

  function hasKeepTogetherAncestor(element, content) {
    let ancestor = element.parentElement?.closest(KEEP_SELECTOR);

    while (ancestor instanceof HTMLElement && content.contains(ancestor)) {
      if (ancestor !== element && isKeepTogetherElement(ancestor)) {
        return true;
      }

      ancestor = ancestor.parentElement?.closest(KEEP_SELECTOR);
    }

    return false;
  }

  function getNextContentElement(element) {
    let nextElement = element.nextElementSibling;

    while (
      nextElement instanceof HTMLElement &&
      nextElement.dataset.draftPdfSpacer === 'true'
    ) {
      nextElement = nextElement.nextElementSibling;
    }

    return nextElement instanceof HTMLElement ? nextElement : null;
  }

  function getElementTargetBottom(element) {
    const rect = getDocumentRect(element);

    if (!element.matches(HEADING_SELECTOR)) {
      return rect.bottom;
    }

    const nextElement = getNextContentElement(element);

    if (!nextElement || nextElement.matches(HEADING_SELECTOR) || !isVisibleElement(nextElement)) {
      return rect.bottom;
    }

    const nextRect = getDocumentRect(nextElement);
    const firstContentSliceHeight = Math.min(nextRect.height, 180);

    return Math.max(rect.bottom, nextRect.top + firstContentSliceHeight);
  }

  function paginateKeepTogetherElements(content) {
    let changed = false;
    const candidates = Array.from(content.querySelectorAll(KEEP_SELECTOR))
      .filter((element) => element instanceof HTMLElement);

    for (const candidate of candidates) {
      if (!(candidate instanceof HTMLElement) ||
          candidate.dataset.draftPdfSpacer === 'true' ||
          !isKeepTogetherElement(candidate) ||
          hasKeepTogetherAncestor(candidate, content)) {
        continue;
      }

      const rect = getDocumentRect(candidate);
      const targetBottom = getElementTargetBottom(candidate);

      if (!crossesPageBoundary(rect.top, targetBottom)) {
        continue;
      }

      changed = ensureSpacerBefore(
        candidate,
        PAGE_SPACER_CLASS,
        getSpacerHeightToNextPage(rect.top)
      ) || changed;
    }

    return changed;
  }

  function getCodeLineElements(content) {
    const prettyCodeLines = Array.from(
      content.querySelectorAll('pre code [data-line]')
    ).filter((element) => element instanceof HTMLElement);

    if (prettyCodeLines.length > 0) {
      return prettyCodeLines;
    }

    return Array.from(content.querySelectorAll('pre code > span'))
      .filter((element) => element instanceof HTMLElement);
  }

  function paginateCodeLines(content) {
    let changed = false;
    const lineElements = getCodeLineElements(content);

    for (const lineElement of lineElements) {
      if (!(lineElement instanceof HTMLElement) ||
          lineElement.dataset.draftPdfSpacer === 'true' ||
          !isVisibleElement(lineElement)) {
        continue;
      }

      const rect = getDocumentRect(lineElement);

      if (rect.height > MAX_KEEP_TOGETHER_HEIGHT ||
          !crossesPageBoundary(rect.top, rect.bottom)) {
        continue;
      }

      changed = ensureSpacerBefore(
        lineElement,
        LINE_SPACER_CLASS,
        getSpacerHeightToNextPage(rect.top)
      ) || changed;
    }

    return changed;
  }

  function getInlineFragments(content) {
    const fragments = Array.from(
      content.querySelectorAll('.' + INLINE_FRAGMENT_CLASS + ',' + INLINE_ATOMIC_SELECTOR)
    );

    return fragments.filter((element) => element instanceof HTMLElement);
  }

  function paginateInlineFragments(content) {
    let changed = false;
    const fragments = getInlineFragments(content);

    for (const fragment of fragments) {
      if (!(fragment instanceof HTMLElement) ||
          fragment.dataset.draftPdfSpacer === 'true' ||
          !isVisibleElement(fragment)) {
        continue;
      }

      const rect = getDocumentRect(fragment);

      if (rect.height > MAX_KEEP_TOGETHER_HEIGHT ||
          !crossesPageBoundary(rect.top, rect.bottom)) {
        continue;
      }

      changed = ensureSpacerBefore(
        fragment,
        LINE_SPACER_CLASS,
        getSpacerHeightToNextPage(rect.top)
      ) || changed;
    }

    return changed;
  }

  async function preparePdfExport() {
    window.draftPdfExportReady = false;
    window.draftPdfExportError = null;

    try {
      document.documentElement.style.width = PAGE_WIDTH + 'px';
      document.body.style.width = PAGE_WIDTH + 'px';
      removeSpacers();

      if (document.fonts?.ready) {
        await Promise.race([
          document.fonts.ready,
          new Promise((resolve) => window.setTimeout(resolve, 2000))
        ]);
      }

      await waitForImages();
      await nextFrame();

      const content = document.querySelector('.draft-pdf-export .preview-content');

      if (!content) {
        window.draftPdfExportReady = true;
        return true;
      }

      wrapInlineTextFragments(content);
      await nextFrame();

      for (let pass = 0; pass < MAX_PASSES; pass += 1) {
        const changedBlocks = paginateKeepTogetherElements(content);
        const changedCodeLines = paginateCodeLines(content);
        const changedInlineFragments = paginateInlineFragments(content);
        const changed = changedBlocks || changedCodeLines || changedInlineFragments;

        await nextFrame();

        if (!changed) {
          break;
        }
      }

      window.draftPdfExportReady = true;
      return true;
    } catch (error) {
      window.draftPdfExportError = error instanceof Error
        ? error.message
        : String(error);
      window.draftPdfExportReady = true;
      return false;
    }
  }

  let preparePromise = null;

  window.draftPreparePdfExport = () => {
    if (!preparePromise) {
      preparePromise = preparePdfExport();
    }

    return preparePromise;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.draftPreparePdfExport();
    }, { once: true });
  } else {
    window.draftPreparePdfExport();
  }
})();
</script>`
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
  const script = layout === 'pdf' ? getPdfExportScript() : ''
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
${script}
</body>
</html>`
}
