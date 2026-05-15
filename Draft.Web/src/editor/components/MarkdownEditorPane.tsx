import type { HTMLAttributes, ReactNode, RefObject } from 'react'
import EditorScrollbar from './EditorScrollbar'

type MarkdownEditorPaneProps = {
  ariaHidden: boolean
  editorBodyRef: RefObject<HTMLDivElement | null>
  editorHostRef: RefObject<HTMLDivElement | null>
  header: ReactNode
  scrollbarProps: HTMLAttributes<HTMLDivElement>
  scrollbarRef: RefObject<HTMLDivElement | null>
  thumbProps: HTMLAttributes<HTMLDivElement>
  thumbRef: RefObject<HTMLDivElement | null>
}

function MarkdownEditorPane({
  ariaHidden,
  editorBodyRef,
  editorHostRef,
  header,
  scrollbarProps,
  scrollbarRef,
  thumbProps,
  thumbRef,
}: MarkdownEditorPaneProps) {
  return (
    <div
      className="editor-pane"
      aria-label="Markdown Editor"
      aria-hidden={ariaHidden}
    >
      {header}
      <div ref={editorBodyRef} className="pane-body editor-body">
        <div ref={editorHostRef} className="editor-host" />
        <EditorScrollbar
          scrollbarProps={scrollbarProps}
          scrollbarRef={scrollbarRef}
          thumbProps={thumbProps}
          thumbRef={thumbRef}
        />
      </div>
    </div>
  )
}

export default MarkdownEditorPane
