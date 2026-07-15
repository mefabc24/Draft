import type { ReactNode } from 'react'

type EditorQuickInsertScrollAreaProps = {
  children: ReactNode
}

function EditorQuickInsertScrollArea({
  children,
}: EditorQuickInsertScrollAreaProps) {
  return (
    <div className="editor-quick-insert-menu-scroll-wrap">
      <div className="editor-quick-insert-menu-scroll">
        <div className="editor-quick-insert-menu-list">
          {children}
        </div>
      </div>
    </div>
  )
}

export default EditorQuickInsertScrollArea
