import { useTranslation } from '../../localization/useTranslation'

type PaneHeaderProps = {
  leftLabel: string
  rightItems: string[]
}

function PaneHeader({ leftLabel, rightItems }: PaneHeaderProps) {
  const { t } = useTranslation()

  return (
    <header className="pane-header">
      <div className="pane-header-left">{leftLabel}</div>
      <div className="pane-header-right" aria-label={t('workspace.paneStats')}>
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
