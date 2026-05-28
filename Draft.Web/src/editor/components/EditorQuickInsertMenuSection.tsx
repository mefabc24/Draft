import type { ReactNode } from 'react'

type EditorQuickInsertMenuSectionProps = {
  children: ReactNode
  expanded: boolean
  icon: ReactNode
  label: string
  onToggle: () => void
}

function EditorQuickInsertMenuSection({
  children,
  expanded,
  icon,
  label,
  onToggle,
}: EditorQuickInsertMenuSectionProps) {
  return (
    <section
      className={`editor-quick-insert-menu-section${
        expanded ? ' is-expanded' : ''
      }`}
    >
      <button
        aria-expanded={expanded}
        className="editor-quick-insert-section-trigger"
        onClick={onToggle}
        onMouseDown={(event) => {
          event.preventDefault()
        }}
        type="button"
      >
        <span className="editor-quick-insert-item-icon">{icon}</span>
        <span className="editor-quick-insert-item-label">{label}</span>
        <span
          className={`editor-quick-insert-chevron${
            expanded ? ' is-expanded' : ''
          }`}
          aria-hidden="true"
        >
          <svg focusable="false" viewBox="0 0 16 16">
            <path d="M3.75 6.25 8 10.5l4.25-4.25" />
          </svg>
        </span>
      </button>
      <div
        aria-hidden={!expanded}
        className="editor-quick-insert-section-content-frame"
        inert={expanded ? undefined : true}
      >
        <div className="editor-quick-insert-section-content">{children}</div>
      </div>
    </section>
  )
}

export default EditorQuickInsertMenuSection
