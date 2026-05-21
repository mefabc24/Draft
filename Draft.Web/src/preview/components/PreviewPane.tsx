import type { CSSProperties, MutableRefObject, ReactNode } from 'react'
import '../styles/previewMarkdown.css'
import type { DraftPreviewTheme } from '../../themes/preview/previewThemeTypes'
import { usePreviewScrollbar } from '../hooks/usePreviewScrollbar'
import PreviewMarkdownRenderer from './PreviewMarkdownRenderer'
import PreviewScrollbar from './PreviewScrollbar'

type PreviewPaneProps = {
  markdown: string
  header: ReactNode
  ariaHidden?: boolean
  previewTheme: DraftPreviewTheme
  previewThemeStyle?: CSSProperties
  previewContentElementRef?: MutableRefObject<HTMLDivElement | null>
  previewScrollElementRef?: MutableRefObject<HTMLDivElement | null>
  onPreviewScroll?: () => void
}

function PreviewPane({
  markdown,
  header,
  ariaHidden = false,
  previewTheme,
  previewThemeStyle,
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
      style={previewThemeStyle}
    >
      {header}

      <div className="pane-body preview-body">
        <div
          ref={setPreviewScrollElement}
          className="preview-scroll"
          onScroll={onPreviewScroll}
        >
          <div ref={setPreviewContentElement} className="preview-content">
            <PreviewMarkdownRenderer
              markdown={markdown}
              previewTheme={previewTheme}
            />
          </div>
        </div>

        <PreviewScrollbar
          scrollbarRef={previewScrollbarRef}
          thumbRef={previewThumbRef}
          onTrackPointerDown={handleTrackPointerDown}
          onThumbPointerDown={handleThumbPointerDown}
          onThumbPointerMove={handleThumbPointerMove}
          onThumbPointerUp={handleThumbPointerUp}
          onThumbPointerCancel={handleThumbPointerCancel}
        />
      </div>
    </article>
  )
}

export default PreviewPane
