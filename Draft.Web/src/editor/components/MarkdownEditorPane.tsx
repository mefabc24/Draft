import type { HTMLAttributes, ReactNode, RefObject } from 'react'
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { useTranslation } from '../../localization/useTranslation'
import type { ShortcutBindings } from '../../shortcuts/shortcutSettings'
import EmptyLineInsertButton from './EmptyLineInsertButton'
import EditorScrollbar from './EditorScrollbar'

type MarkdownEditorPaneProps = {
  ariaHidden: boolean
  editor: monaco.editor.IStandaloneCodeEditor | null
  editorBodyRef: RefObject<HTMLDivElement | null>
  editorHostRef: RefObject<HTMLDivElement | null>
  header: ReactNode
  scrollbarProps: HTMLAttributes<HTMLDivElement>
  scrollbarRef: RefObject<HTMLDivElement | null>
  shortcutBindings: ShortcutBindings
  thumbProps: HTMLAttributes<HTMLDivElement>
  thumbRef: RefObject<HTMLDivElement | null>
}

function MarkdownEditorPane({
  ariaHidden,
  editor,
  editorBodyRef,
  editorHostRef,
  header,
  scrollbarProps,
  scrollbarRef,
  shortcutBindings,
  thumbProps,
  thumbRef,
}: MarkdownEditorPaneProps) {
  const { t } = useTranslation()

  return (
    <div
      className="editor-pane"
      aria-label={t('editor.markdownEditor')}
      aria-hidden={ariaHidden}
    >
      {header}
      <div ref={editorBodyRef} className="pane-body editor-body">
        <div ref={editorHostRef} className="editor-host" />
        {ariaHidden ? null : (
          <EmptyLineInsertButton
            editor={editor}
            editorBodyRef={editorBodyRef}
            shortcutBindings={shortcutBindings}
          />
        )}
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
