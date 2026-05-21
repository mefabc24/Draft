import {
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import { MarkdownHooks } from 'react-markdown'
import rehypePrettyCode, {
  type Options as RehypePrettyCodeOptions,
} from 'rehype-pretty-code'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import type { PluggableList } from 'unified'
import { postOpenExternalUrl } from '../../app/webview/draftWebViewMessages'
import type { DraftPreviewTheme } from '../../themes/preview/previewThemeTypes'
import {
  getOrderedListMarkerStyle,
  getUnorderedListMarkerStyle,
} from '../../themes/preview/previewThemeStyles'
import { rehypeSourceTextSpans } from '../sourceMapping/sourceTextSpansPlugin'
import type { SourceMappedNode } from '../previewTypes'

type PreviewMarkdownRendererProps = {
  markdown: string
  previewTheme: DraftPreviewTheme
}

type PreviewCodeBlockProps = ComponentPropsWithoutRef<'pre'> & {
  sourceLine?: number
}

type ListCssProperties = CSSProperties & Record<`--${string}`, string>

type PreviewListProps<TagName extends 'ol' | 'ul'> =
  ComponentPropsWithoutRef<TagName> & {
    sourceLine?: number
  }

const COPY_ICON_SRC = `${import.meta.env.BASE_URL}icons/Copy.svg`
const COPY_FEEDBACK_MS = 1000
const PRETTY_CODE_FALLBACK_THEME = 'github-dark'
const supportedExternalLinkProtocols = new Set(['http:', 'https:', 'mailto:'])
const remarkPlugins: PluggableList = [remarkGfm]
const ListDepthContext = createContext(0)
const PreviewThemeContext = createContext<DraftPreviewTheme | null>(null)

function getSourceLine(node: SourceMappedNode | undefined) {
  const line = node?.position?.start?.line
  return typeof line === 'number' && Number.isFinite(line) ? line : undefined
}

function getTextFromReactNode(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }

  if (Array.isArray(node)) {
    return node.map(getTextFromReactNode).join('')
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getTextFromReactNode(node.props.children)
  }

  return ''
}

function copyTextWithTextarea(text: string) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '0'
  textarea.style.width = '1px'
  textarea.style.height = '1px'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'

  document.body.append(textarea)
  textarea.focus({ preventScroll: true })
  textarea.select()

  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea.remove()
  }
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fall back for WebView/file contexts where async clipboard is blocked.
    }
  }

  return copyTextWithTextarea(text)
}

function getNormalizedExternalHref(href: string | undefined) {
  const trimmedHref = href?.trim()

  if (!trimmedHref || trimmedHref.startsWith('#')) {
    return null
  }

  try {
    const url = new URL(trimmedHref)

    return supportedExternalLinkProtocols.has(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

function openExternalHref(href: string) {
  postOpenExternalUrl(href)

  if (window.chrome?.webview) {
    return
  }

  window.open(href, '_blank', 'noopener,noreferrer')
}

function getRehypePlugins(previewTheme: DraftPreviewTheme): PluggableList {
  const plugins: PluggableList = [rehypeRaw]

  if (previewTheme.usePrettyCode) {
    const prettyCodeOptions: RehypePrettyCodeOptions = {
      bypassInlineCode: true,
      grid: true,
      keepBackground: false,
      theme: previewTheme.prettyCodeTheme ?? PRETTY_CODE_FALLBACK_THEME,
    }

    plugins.push([rehypePrettyCode, prettyCodeOptions])
  }

  plugins.push(rehypeSourceTextSpans)

  return plugins
}

function PreviewCodeBlock({
  children,
  sourceLine,
  ...props
}: PreviewCodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const resetCopiedTimeoutRef = useRef(0)
  const codeText = getTextFromReactNode(children)

  useEffect(() => {
    return () => {
      if (resetCopiedTimeoutRef.current !== 0) {
        window.clearTimeout(resetCopiedTimeoutRef.current)
      }
    }
  }, [])

  async function handleCopyClick(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()

    const didCopy = await copyTextToClipboard(codeText)

    if (!didCopy) {
      return
    }

    setCopied(true)

    if (resetCopiedTimeoutRef.current !== 0) {
      window.clearTimeout(resetCopiedTimeoutRef.current)
    }

    resetCopiedTimeoutRef.current = window.setTimeout(() => {
      setCopied(false)
      resetCopiedTimeoutRef.current = 0
    }, COPY_FEEDBACK_MS)
  }

  return (
    <div className="preview-code-block" data-source-line={sourceLine}>
      <pre {...props}>{children}</pre>
      <button
        type="button"
        className={`preview-code-block-copy-button${copied ? ' is-copied' : ''}`}
        aria-label={copied ? 'Copied code block' : 'Copy code block'}
        title={copied ? 'Copied' : 'Copy'}
        onClick={handleCopyClick}
        onMouseDown={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
      >
        <span className="preview-code-block-copy-icon" aria-hidden="true">
          <img src={COPY_ICON_SRC} alt="" />
        </span>
        <svg
          className="preview-code-block-check-icon"
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <path d="M3.6 8.4 6.7 11.4 12.6 4.8" />
        </svg>
      </button>
    </div>
  )
}

function getOrderedListStyle(
  previewTheme: DraftPreviewTheme | null,
  depth: number,
  style: CSSProperties | undefined,
) {
  if (!previewTheme) {
    return style
  }

  const markerStyle = getOrderedListMarkerStyle(previewTheme, depth)

  return {
    ...style,
    '--preview-current-ordered-list-marker-color': markerStyle.color,
    '--preview-current-ordered-list-marker-font-weight':
      markerStyle.fontWeight,
    '--preview-current-ordered-list-marker-numbering':
      markerStyle.numbering,
    '--preview-current-ordered-list-marker-size': markerStyle.size,
    '--preview-current-ordered-list-marker-spacing': markerStyle.spacing,
    listStyleType: markerStyle.numbering,
  } satisfies ListCssProperties
}

function getUnorderedListStyle(
  previewTheme: DraftPreviewTheme | null,
  depth: number,
  style: CSSProperties | undefined,
) {
  if (!previewTheme) {
    return style
  }

  const markerStyle = getUnorderedListMarkerStyle(previewTheme, depth)

  return {
    ...style,
    '--preview-current-unordered-list-marker-color': markerStyle.color,
    '--preview-current-unordered-list-marker-shape': markerStyle.shape,
    '--preview-current-unordered-list-marker-size': markerStyle.size,
    '--preview-current-unordered-list-marker-spacing': markerStyle.spacing,
    listStyleType: markerStyle.shape,
  } satisfies ListCssProperties
}

function PreviewOrderedList({
  children,
  sourceLine,
  style,
  ...props
}: PreviewListProps<'ol'>) {
  const depth = useContext(ListDepthContext)
  const previewTheme = useContext(PreviewThemeContext)
  const listStyle = getOrderedListStyle(previewTheme, depth, style)

  return (
    <ListDepthContext.Provider value={depth + 1}>
      <ol
        {...props}
        data-list-depth={depth}
        data-source-line={sourceLine}
        style={listStyle}
      >
        {children}
      </ol>
    </ListDepthContext.Provider>
  )
}

function PreviewUnorderedList({
  children,
  sourceLine,
  style,
  ...props
}: PreviewListProps<'ul'>) {
  const depth = useContext(ListDepthContext)
  const previewTheme = useContext(PreviewThemeContext)
  const listStyle = getUnorderedListStyle(previewTheme, depth, style)

  return (
    <ListDepthContext.Provider value={depth + 1}>
      <ul
        {...props}
        data-list-depth={depth}
        data-source-line={sourceLine}
        style={listStyle}
      >
        {children}
      </ul>
    </ListDepthContext.Provider>
  )
}

const previewComponents: Components = {
  h1({ node, ...props }) {
    return <h1 {...props} data-source-line={getSourceLine(node)} />
  },
  h2({ node, ...props }) {
    return <h2 {...props} data-source-line={getSourceLine(node)} />
  },
  h3({ node, ...props }) {
    return <h3 {...props} data-source-line={getSourceLine(node)} />
  },
  h4({ node, ...props }) {
    return <h4 {...props} data-source-line={getSourceLine(node)} />
  },
  h5({ node, ...props }) {
    return <h5 {...props} data-source-line={getSourceLine(node)} />
  },
  h6({ node, ...props }) {
    return <h6 {...props} data-source-line={getSourceLine(node)} />
  },
  p({ node, ...props }) {
    return <p {...props} data-source-line={getSourceLine(node)} />
  },
  li({ node, ...props }) {
    return <li {...props} data-source-line={getSourceLine(node)} />
  },
  ol({ node, ...props }) {
    return <PreviewOrderedList {...props} sourceLine={getSourceLine(node)} />
  },
  ul({ node, ...props }) {
    return <PreviewUnorderedList {...props} sourceLine={getSourceLine(node)} />
  },
  blockquote({ node, ...props }) {
    return <blockquote {...props} data-source-line={getSourceLine(node)} />
  },
  a({ node, href, onClick, ...props }) {
    const normalizedHref = getNormalizedExternalHref(href)

    return (
      <a
        {...props}
        href={href}
        data-source-line={getSourceLine(node)}
        onClick={(event) => {
          onClick?.(event)

          if (event.defaultPrevented) {
            return
          }

          if (!normalizedHref) {
            if (!href?.startsWith('#')) {
              event.preventDefault()
            }

            return
          }

          event.preventDefault()
          openExternalHref(normalizedHref)
        }}
      />
    )
  },
  pre({ node, children, ...props }) {
    return (
      <PreviewCodeBlock {...props} sourceLine={getSourceLine(node)}>
        {children}
      </PreviewCodeBlock>
    )
  },
  table({ node, ...props }) {
    return <table {...props} data-source-line={getSourceLine(node)} />
  },
  hr({ node, ...props }) {
    return <hr {...props} data-source-line={getSourceLine(node)} />
  },
}

function PreviewMarkdownRenderer({
  markdown,
  previewTheme,
}: PreviewMarkdownRendererProps) {
  const rehypePlugins = useMemo(
    () => getRehypePlugins(previewTheme),
    [previewTheme],
  )

  return (
    <PreviewThemeContext.Provider value={previewTheme}>
      <MarkdownHooks
        components={previewComponents}
        rehypePlugins={rehypePlugins}
        remarkPlugins={remarkPlugins}
      >
        {markdown}
      </MarkdownHooks>
    </PreviewThemeContext.Provider>
  )
}

export default PreviewMarkdownRenderer
