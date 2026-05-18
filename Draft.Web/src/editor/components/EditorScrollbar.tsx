import type { HTMLAttributes, RefObject } from 'react'

type EditorScrollbarProps = {
  scrollbarProps: HTMLAttributes<HTMLDivElement>
  scrollbarRef: RefObject<HTMLDivElement | null>
  thumbProps: HTMLAttributes<HTMLDivElement>
  thumbRef: RefObject<HTMLDivElement | null>
}

function EditorScrollbar({
  scrollbarProps,
  scrollbarRef,
  thumbProps,
  thumbRef,
}: EditorScrollbarProps) {
  return (
    <div
      ref={scrollbarRef}
      className="editor-scrollbar"
      data-dragging="false"
      data-scrollable="false"
      aria-hidden="true"
      {...scrollbarProps}
    >
      <div
        ref={thumbRef}
        className="editor-scrollbar-thumb"
        {...thumbProps}
      />
    </div>
  )
}

export default EditorScrollbar
