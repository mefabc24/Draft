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
    }
  }
}

type PreviewPaneProps = {
  markdown: string
  headerLeft: string
  headerRight: string[]
  ariaHidden?: boolean
  previewScrollElementRef?: MutableRefObject<HTMLDivElement | null>
  onPreviewScroll?: () => void
}

function getSourceLine(node: SourceMappedNode | undefined) {
  const line = node?.position?.start?.line
  return typeof line === 'number' && Number.isFinite(line) ? line : undefined
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
          <div ref={previewContentRef} className="preview-content">
            <ReactMarkdown components={previewComponents} remarkPlugins={[remarkGfm]}>
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
