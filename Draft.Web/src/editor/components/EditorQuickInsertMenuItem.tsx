import type { ReactNode } from 'react'

type EditorQuickInsertMenuItemProps = {
  icon?: ReactNode
  label: string
  nested?: boolean
  onSelect: () => void
  shortcut?: string
}

function EditorQuickInsertMenuItem({
  icon,
  label,
  nested = false,
  onSelect,
  shortcut,
}: EditorQuickInsertMenuItemProps) {
  return (
    <button
      className={`editor-quick-insert-menu-item${nested ? ' is-nested' : ''}`}
      onClick={onSelect}
      onMouseDown={(event) => {
        event.preventDefault()
      }}
      role="menuitem"
      type="button"
    >
      {icon ? (
        <span className="editor-quick-insert-item-icon">{icon}</span>
      ) : (
        <span className="editor-quick-insert-item-spacer" aria-hidden="true" />
      )}
      <span className="editor-quick-insert-item-label">{label}</span>
      {shortcut ? (
        <span className="editor-quick-insert-item-shortcut">{shortcut}</span>
      ) : null}
    </button>
  )
}

export default EditorQuickInsertMenuItem
