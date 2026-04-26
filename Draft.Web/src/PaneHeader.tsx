type PaneHeaderProps = {
  leftLabel: string
  rightItems: string[]
}

function PaneHeader({ leftLabel, rightItems }: PaneHeaderProps) {
  return (
    <header className="pane-header">
      <div className="pane-header-left">{leftLabel}</div>
      <div className="pane-header-right" aria-label="Pane stats">
        {rightItems.map((item) => (
          <span key={item} className="pane-header-stat">
            {item}
          </span>
        ))}
      </div>
    </header>
  )
}

export default PaneHeader
