import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react'
import { clamp } from '../../shared/utils/clamp'
import { isValidHttpUrl } from '../../shared/validation/urlValidation'
import type { ToolbarTooltipContent } from './ToolbarTooltip'
import ToolbarButton from './ToolbarButton'
import ToolbarIcon from './ToolbarIcon'
import '../styles/previewEditMenu.css'
import '../styles/linkEditMenu.css'

type LinkEditInitialState = {
  label: string
  url: string
}

type LinkEditMenuProps = {
  active: boolean
  initialState: LinkEditInitialState
  onCancel: () => void
  onClose: () => void
  onConfirm: (label: string, url: string) => void
  onOpen: () => LinkEditInitialState | null
  onTooltipHide?: () => void
  onTooltipShow?: (
    target: HTMLButtonElement,
    tooltip: ToolbarTooltipContent,
  ) => void
  open: boolean
  toolbarRef: RefObject<HTMLDivElement | null>
  workspaceRef: RefObject<HTMLElement | null>
}

type LinkEditMenuGeometry = {
  left: number
  placement: 'bottom' | 'top'
  top: number
}

const MENU_EDGE_PADDING = 8
const MENU_GAP = 12

function getMenuBoundaryRect(toolbar: HTMLElement) {
  const boundaryElement = toolbar.closest('.workspace') ?? toolbar.closest('.editor-body')

  return (
    boundaryElement?.getBoundingClientRect() ?? {
      bottom: window.innerHeight,
      left: 0,
      right: window.innerWidth,
      top: 0,
    }
  )
}

function LinkFieldIcon({ type }: { type: 'link' | 'text' }) {
  return (
    <img
      className="link-edit-field-icon"
      src={`${import.meta.env.BASE_URL}icons/${
        type === 'text' ? 'Text.svg' : 'Link.svg'
      }`}
      alt=""
      aria-hidden="true"
    />
  )
}

function ValidationIcon({ valid }: { valid: boolean }) {
  return (
    <img
      className={`link-edit-validation-icon ${valid ? 'is-valid' : 'is-invalid'}`}
      src={`${import.meta.env.BASE_URL}icons/${
        valid ? 'Success.svg' : 'Failed.svg'
      }`}
      alt=""
      aria-hidden="true"
    />
  )
}

function LinkEditMenu({
  active,
  initialState,
  onCancel,
  onClose,
  onConfirm,
  onOpen,
  onTooltipHide,
  onTooltipShow,
  open,
  toolbarRef,
  workspaceRef,
}: LinkEditMenuProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const textInputRef = useRef<HTMLInputElement | null>(null)
  const [label, setLabel] = useState(initialState.label)
  const [url, setUrl] = useState(initialState.url)
  const [urlTouched, setUrlTouched] = useState(initialState.url.length > 0)
  const [menuGeometry, setMenuGeometry] = useState<LinkEditMenuGeometry>({
    left: 0,
    placement: 'bottom',
    top: 0,
  })
  const urlIsValid = isValidHttpUrl(url)
  const confirmDisabled = label.trim().length === 0 || !urlIsValid

  const updateMenuGeometry = useCallback(() => {
    const menu = menuRef.current
    const trigger = triggerRef.current
    const toolbar = toolbarRef.current

    if (!menu || !trigger || !toolbar) {
      return
    }

    const boundaryRect =
      workspaceRef.current?.getBoundingClientRect() ??
      getMenuBoundaryRect(toolbar)
    const toolbarRect = toolbar.getBoundingClientRect()
    const triggerRect = trigger.getBoundingClientRect()
    const menuWidth = menu.offsetWidth
    const menuHeight = menu.offsetHeight
    const availableBelow =
      boundaryRect.bottom - triggerRect.bottom - MENU_GAP - MENU_EDGE_PADDING
    const availableAbove =
      triggerRect.top - boundaryRect.top - MENU_GAP - MENU_EDGE_PADDING
    const placement =
      menuHeight > availableBelow && availableAbove > availableBelow
        ? 'top'
        : 'bottom'
    const minLeft = boundaryRect.left - toolbarRect.left + MENU_EDGE_PADDING
    const maxLeft =
      boundaryRect.right - toolbarRect.left - menuWidth - MENU_EDGE_PADDING
    const unclampedLeft =
      triggerRect.left + triggerRect.width / 2 - toolbarRect.left - menuWidth / 2
    const left = clamp(unclampedLeft, minLeft, Math.max(minLeft, maxLeft))
    const top =
      placement === 'bottom'
        ? triggerRect.bottom - toolbarRect.top + MENU_GAP
        : triggerRect.top - toolbarRect.top - menuHeight - MENU_GAP

    setMenuGeometry((currentGeometry) => {
      if (
        currentGeometry.left === left &&
        currentGeometry.placement === placement &&
        currentGeometry.top === top
      ) {
        return currentGeometry
      }

      return { left, placement, top }
    })
  }, [toolbarRef, workspaceRef])

  useEffect(() => {
    if (!open) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      updateMenuGeometry()
      textInputRef.current?.focus()
      textInputRef.current?.select()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [open, updateMenuGeometry])

  useEffect(() => {
    if (!open) {
      return
    }

    window.addEventListener('resize', updateMenuGeometry)
    window.addEventListener('scroll', updateMenuGeometry, true)

    return () => {
      window.removeEventListener('resize', updateMenuGeometry)
      window.removeEventListener('scroll', updateMenuGeometry, true)
    }
  }, [open, updateMenuGeometry])

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target

      if (!(target instanceof Node)) {
        return
      }

      if (
        menuRef.current?.contains(target) ||
        toolbarRef.current?.contains(target)
      ) {
        return
      }

      onClose()
    }

    document.addEventListener('pointerdown', handlePointerDown, true)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [onClose, open, toolbarRef])

  const handleOpen = useCallback(() => {
    const nextState = onOpen() ?? initialState

    setLabel(nextState.label)
    setUrl(nextState.url)
    setUrlTouched(nextState.url.length > 0)
  }, [initialState, onOpen])

  const handleConfirm = useCallback(() => {
    if (!confirmDisabled) {
      onConfirm(label, url)
    }
  }, [confirmDisabled, label, onConfirm, url])

  const handleKeyDown = (event: ReactKeyboardEvent) => {
    event.stopPropagation()

    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      handleConfirm()
    }
  }

  const menuStyle = {
    left: `${menuGeometry.left}px`,
    top: `${menuGeometry.top}px`,
  } satisfies CSSProperties
  const showUrlValidation = urlTouched && url.length > 0

  return (
    <>
      <ToolbarButton
        ref={triggerRef}
        active={active || open}
        ariaExpanded={open}
        ariaHasPopup="dialog"
        ariaLabel="Edit link"
        onClick={handleOpen}
        onTooltipHide={onTooltipHide}
        onTooltipShow={onTooltipShow}
        tooltip={{ label: 'Link', shortcut: 'CTRL + K' }}
      >
        <ToolbarIcon name="link" />
      </ToolbarButton>

      {open ? (
        <div
          ref={menuRef}
          className={`preview-edit-menu link-edit-menu place-${menuGeometry.placement}`}
          data-toolbar-popup="true"
          role="dialog"
          aria-label="Edit Markdown link"
          style={menuStyle}
          onKeyDown={handleKeyDown}
        >
          <label className="link-edit-field">
            <LinkFieldIcon type="text" />
            <input
              ref={textInputRef}
              className="link-edit-input"
              value={label}
              spellCheck={false}
              aria-label="Link text"
              onChange={(event) => {
                setLabel(event.target.value)
              }}
              onKeyDown={handleKeyDown}
            />
          </label>
          <label className="link-edit-field">
            <LinkFieldIcon type="link" />
            <input
              className="link-edit-input"
              value={url}
              spellCheck={false}
              placeholder="https://example.com"
              aria-label="Link URL"
              onBlur={() => {
                setUrlTouched(true)
              }}
              onChange={(event) => {
                setUrl(event.target.value)
                setUrlTouched(true)
              }}
              onKeyDown={handleKeyDown}
            />
            {showUrlValidation ? <ValidationIcon valid={urlIsValid} /> : null}
          </label>
          <div className="preview-edit-actions">
            <button
              type="button"
              className="preview-edit-action preview-edit-action-secondary"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="preview-edit-action preview-edit-action-primary"
              disabled={confirmDisabled}
              onClick={handleConfirm}
            >
              Confirm
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default LinkEditMenu
