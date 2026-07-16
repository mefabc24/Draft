import type {
  PointerEvent as ReactPointerEvent,
  RefObject,
} from 'react'

type PreviewCodeBlockScrollbarProps = {
  onThumbPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void
  onThumbPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  onThumbPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void
  onThumbPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void
  onTrackPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  scrollbarRef: RefObject<HTMLDivElement | null>
  thumbRef: RefObject<HTMLDivElement | null>
}

function PreviewCodeBlockScrollbar({
  onThumbPointerCancel,
  onThumbPointerDown,
  onThumbPointerMove,
  onThumbPointerUp,
  onTrackPointerDown,
  scrollbarRef,
  thumbRef,
}: PreviewCodeBlockScrollbarProps) {
  return (
    <div
      ref={scrollbarRef}
      className="preview-code-block-scrollbar"
      data-dragging="false"
      data-scrollable="false"
      aria-hidden="true"
      onPointerDown={onTrackPointerDown}
    >
      <div
        ref={thumbRef}
        className="preview-code-block-scrollbar-thumb"
        onPointerDown={onThumbPointerDown}
        onPointerMove={onThumbPointerMove}
        onPointerUp={onThumbPointerUp}
        onPointerCancel={onThumbPointerCancel}
      />
    </div>
  )
}

export default PreviewCodeBlockScrollbar
