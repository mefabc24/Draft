import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './PreviewContent.css'
import PaneHeader from './PaneHeader'
import { usePreviewScrollbar } from './usePreviewScrollbar'

type PreviewPaneProps = {
  markdown: string
  headerLeft: string
  headerRight: string[]
  ariaHidden?: boolean
}

function PreviewPane({
  markdown,
  headerLeft,
  headerRight,
  ariaHidden = false,
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

  return (
    <article
      className="preview-pane"
      aria-label="Markdown Preview"
      aria-hidden={ariaHidden}
    >
      <PaneHeader leftLabel={headerLeft} rightItems={headerRight} />

      <div className="pane-body preview-body">
        <div
          ref={previewScrollRef}
          className="preview-scroll"
        >
          <div ref={previewContentRef} className="preview-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
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
