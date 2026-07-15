import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from '../../localization/useTranslation'
import { getPreviewThemeOptions } from '../../themes'

type WorkspaceDevMenuProps = {
  activePreviewThemeId: string
  onPreviewThemeChange: (themeId: string) => void
}

function isDraftWebViewHost() {
  return window.chrome?.webview !== undefined
}

function WorkspaceDevMenu({
  activePreviewThemeId,
  onPreviewThemeChange,
}: WorkspaceDevMenuProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const previewThemeOptions = useMemo(() => getPreviewThemeOptions(), [])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isOpen])

  if (!import.meta.env.DEV || isDraftWebViewHost()) {
    return null
  }

  return (
    <div className="workspace-dev-menu" ref={menuRef}>
      <button
        type="button"
        className="workspace-dev-menu-trigger"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((current) => !current)}
      >
        {t('dev.menu')}
      </button>
      {isOpen && (
        <div className="workspace-dev-menu-popover" role="menu">
          <label className="workspace-dev-menu-item">
            <span>{t('dev.theme')}</span>
            <select
              value={activePreviewThemeId}
              onChange={(event) => onPreviewThemeChange(event.target.value)}
            >
              {previewThemeOptions.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  )
}

export default WorkspaceDevMenu
