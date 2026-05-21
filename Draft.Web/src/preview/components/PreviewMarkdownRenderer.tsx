import {
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { rehypeSourceTextSpans } from '../sourceMapping/sourceTextSpansPlugin'
import type { SourceMappedNode } from '../previewTypes'

type PreviewMarkdownRendererProps = {
  markdown: string
}

type PreviewCodeBlockProps = ComponentPropsWithoutRef<'pre'> & {
  sourceLine?: number
}

const COPY_ICON_SRC = `${import.meta.env.BASE_URL}icons/Copy.svg`
const COPY_FEEDBACK_MS = 1400

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

function PreviewMarkdownRenderer({ markdown }: PreviewMarkdownRendererProps) {
  return (
    <ReactMarkdown
      components={previewComponents}
      rehypePlugins={[rehypeSourceTextSpans]}
      remarkPlugins={[remarkGfm]}
    >
      {markdown}
    </ReactMarkdown>
  )
}

export default PreviewMarkdownRenderer
