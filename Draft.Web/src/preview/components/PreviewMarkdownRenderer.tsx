import {
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
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
const COPY_FEEDBACK_MS = 1400
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
        <img src={COPY_ICON_SRC} alt="" aria-hidden="true" />
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
  return (
    <PreviewThemeContext.Provider value={previewTheme}>
      <ReactMarkdown
        components={previewComponents}
        rehypePlugins={[rehypeRaw, rehypeSourceTextSpans]}
        remarkPlugins={[remarkGfm]}
      >
        {markdown}
      </ReactMarkdown>
    </PreviewThemeContext.Provider>
  )
}

export default PreviewMarkdownRenderer
