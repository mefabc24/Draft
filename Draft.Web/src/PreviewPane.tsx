import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { MutableRefObject } from 'react'
import type { Components } from 'react-markdown'
import './PreviewContent.css'
import PaneHeader from './PaneHeader'
import { usePreviewScrollbar } from './usePreviewScrollbar'

type SourceMappedNode = {
  position?: {
    start?: {
      line?: number
      offset?: number
    }
    end?: {
      offset?: number
    }
  }
}

type PreviewPaneProps = {
  markdown: string
  headerLeft: string
  headerRight: string[]
  ariaHidden?: boolean
  previewContentElementRef?: MutableRefObject<HTMLDivElement | null>
  previewScrollElementRef?: MutableRefObject<HTMLDivElement | null>
  onPreviewScroll?: () => void
}

type HastNode = {
  children?: HastNode[]
  position?: {
    start?: {
      offset?: number
    }
    end?: {
      offset?: number
    }
  }
  properties?: Record<string, unknown>
  tagName?: string
  type: string
  value?: string
}

function getSourceLine(node: SourceMappedNode | undefined) {
  const line = node?.position?.start?.line
  return typeof line === 'number' && Number.isFinite(line) ? line : undefined
}

function getSourceOffset(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function shouldSkipSourceTextMapping(node: HastNode) {
  return node.type === 'element' && node.tagName === 'pre'
}

function wrapSourceMappedTextNodes(node: HastNode) {
  if (!node.children || shouldSkipSourceTextMapping(node)) {
    return
  }

  node.children = node.children.map((child) => {
    if (child.type !== 'text') {
      wrapSourceMappedTextNodes(child)
      return child
    }

    const startOffset = getSourceOffset(child.position?.start?.offset)
    const endOffset = getSourceOffset(child.position?.end?.offset)

    if (
      startOffset === null ||
      endOffset === null ||
      startOffset >= endOffset ||
      typeof child.value !== 'string'
    ) {
      return child
    }

    return {
      type: 'element',
      tagName: 'span',
      properties: {
        'data-source-end': String(endOffset),
        'data-source-start': String(startOffset),
        className: ['preview-source-text'],
      },
      children: [child],
      position: child.position,
    } satisfies HastNode
  })
}

function rehypeSourceTextSpans() {
  return (tree: HastNode) => {
    wrapSourceMappedTextNodes(tree)
  }
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
  pre({ node, ...props }) {
    return <pre {...props} data-source-line={getSourceLine(node)} />
  },
  table({ node, ...props }) {
    return <table {...props} data-source-line={getSourceLine(node)} />
  },
  hr({ node, ...props }) {
    return <hr {...props} data-source-line={getSourceLine(node)} />
  },
}

function PreviewPane({
  markdown,
  headerLeft,
  headerRight,
  ariaHidden = false,
  previewContentElementRef,
  previewScrollElementRef,
  onPreviewScroll,
}: PreviewPaneProps) {
  const {
    previewScrollRef,
    previewContentRef,
    previewScrollbarRef,
    previewThumbRef,
    handleTrackPointerDown,
    handleThumbPointerDown,
    handleThumbPointerMove,
    handleThumbPointerUp,
    handleThumbPointerCancel,
  } = usePreviewScrollbar()
  const setPreviewScrollElement = (element: HTMLDivElement | null) => {
    previewScrollRef.current = element

    if (previewScrollElementRef) {
      previewScrollElementRef.current = element
    }
  }
  const setPreviewContentElement = (element: HTMLDivElement | null) => {
    previewContentRef.current = element

    if (previewContentElementRef) {
      previewContentElementRef.current = element
    }
  }

  return (
    <article
      className="preview-pane"
      aria-label="Markdown Preview"
      aria-hidden={ariaHidden}
    >
      <PaneHeader leftLabel={headerLeft} rightItems={headerRight} />

      <div className="pane-body preview-body">
        <div
          ref={setPreviewScrollElement}
          className="preview-scroll"
          onScroll={onPreviewScroll}
        >
          <div ref={setPreviewContentElement} className="preview-content">
            <ReactMarkdown
              components={previewComponents}
              rehypePlugins={[rehypeSourceTextSpans]}
              remarkPlugins={[remarkGfm]}
            >
              {markdown}
            </ReactMarkdown>
          </div>
        </div>

        <div
          ref={previewScrollbarRef}
          className="preview-scrollbar"
          data-dragging="false"
          data-scrollable="false"
          aria-hidden="true"
          onPointerDown={handleTrackPointerDown}
        >
          <div
            ref={previewThumbRef}
            className="preview-scrollbar-thumb"
            onPointerDown={handleThumbPointerDown}
            onPointerMove={handleThumbPointerMove}
            onPointerUp={handleThumbPointerUp}
            onPointerCancel={handleThumbPointerCancel}
          />
        </div>
      </div>
    </article>
  )
}

export default PreviewPane
