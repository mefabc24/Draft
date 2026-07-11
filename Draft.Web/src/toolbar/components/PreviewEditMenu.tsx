import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react'
import { useTranslation } from '../../localization/useTranslation'
import { eventMatchesShortcutAction } from '../../shortcuts/shortcutMatching'
import {
  shortcutActionIds,
  type ShortcutBindings,
} from '../../shortcuts/shortcutSettings'
import { clamp } from '../../shared/utils/clamp'
import type { ToolbarTooltipContent } from './ToolbarTooltip'
import ToolbarButton from './ToolbarButton'
import ToolbarIcon from './ToolbarIcon'
import '../styles/previewEditMenu.css'

type PreviewEditMenuProps = {
  onCancel: () => void
  onClose: () => void
  onConfirm: (value: string) => void
  onOpen: () => string | null
  onTooltipHide?: () => void
  onTooltipShow?: (
    target: HTMLButtonElement,
    tooltip: ToolbarTooltipContent,
  ) => void
  open: boolean
  shortcutBindings: ShortcutBindings
  sourceText: string
  toolbarRef: RefObject<HTMLDivElement | null>
  triggerShortcut: string
  workspaceRef: RefObject<HTMLElement | null>
}

type PreviewEditMenuGeometry = {
  left: number
  placement: 'bottom' | 'top'
  top: number
}

const MENU_EDGE_PADDING = 8
const MENU_GAP = 12
const TEXTBOX_MAX_ROWS = 10

function readPixelValue(value: string) {
  const parsedValue = Number.parseFloat(value)

  return Number.isFinite(parsedValue) ? parsedValue : 0
}

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

function PreviewEditMenu({
  onCancel,
  onClose,
  onConfirm,
  onOpen,
  onTooltipHide,
  onTooltipShow,
  open,
  shortcutBindings,
  sourceText,
  toolbarRef,
  triggerShortcut,
  workspaceRef,
}: PreviewEditMenuProps) {
  const { t } = useTranslation()
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [value, setValue] = useState(sourceText)
  const [menuGeometry, setMenuGeometry] = useState<PreviewEditMenuGeometry>({
    left: 0,
    placement: 'bottom',
    top: 0,
  })

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

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current
    const menu = menuRef.current

    if (!textarea || !menu) {
      return
    }

    const textareaStyle = window.getComputedStyle(textarea)
    const menuStyle = window.getComputedStyle(menu)
    const lineHeight = readPixelValue(textareaStyle.lineHeight) || 20
    const textareaChrome =
      readPixelValue(textareaStyle.paddingTop) +
      readPixelValue(textareaStyle.paddingBottom) +
      readPixelValue(textareaStyle.borderTopWidth) +
      readPixelValue(textareaStyle.borderBottomWidth)
    const singleLineHeight = lineHeight + textareaChrome
    const maxRowsHeight = lineHeight * TEXTBOX_MAX_ROWS + textareaChrome
    let availableTextboxHeight = maxRowsHeight
    const trigger = triggerRef.current
    const toolbar = toolbarRef.current

    if (trigger && toolbar) {
      const boundaryRect =
        workspaceRef.current?.getBoundingClientRect() ??
        getMenuBoundaryRect(toolbar)
      const triggerRect = trigger.getBoundingClientRect()
      const actionsHeight =
        menu.querySelector<HTMLElement>('.preview-edit-actions')?.offsetHeight ??
        0
      const menuChrome =
        readPixelValue(menuStyle.paddingTop) +
        readPixelValue(menuStyle.paddingBottom) +
        readPixelValue(menuStyle.borderTopWidth) +
        readPixelValue(menuStyle.borderBottomWidth) +
        readPixelValue(menuStyle.rowGap)
      const availableBelow =
        boundaryRect.bottom - triggerRect.bottom - MENU_GAP - MENU_EDGE_PADDING
      const availableAbove =
        triggerRect.top - boundaryRect.top - MENU_GAP - MENU_EDGE_PADDING
      const availableMenuHeight = Math.max(availableBelow, availableAbove)

      availableTextboxHeight = Math.max(
        singleLineHeight,
        availableMenuHeight - actionsHeight - menuChrome,
      )
    }

    const maxHeight = Math.max(
      singleLineHeight,
      Math.min(maxRowsHeight, availableTextboxHeight),
    )

    textarea.style.height = 'auto'
    textarea.style.maxHeight = `${maxHeight}px`

    const nextHeight = Math.min(textarea.scrollHeight, maxHeight)

    textarea.style.height = `${nextHeight}px`
    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight + 0.5 ? 'auto' : 'hidden'

    updateMenuGeometry()
  }, [toolbarRef, updateMenuGeometry, workspaceRef])

  useLayoutEffect(() => {
    if (!open) {
      return
    }

    resizeTextarea()
  }, [open, resizeTextarea, value])

  useEffect(() => {
    if (!open) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      resizeTextarea()
      const textarea = textareaRef.current

      textarea?.focus()
      textarea?.setSelectionRange(0, textarea.value.length)
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [open, resizeTextarea])

  useEffect(() => {
    if (!open) {
      return
    }

    window.addEventListener('resize', resizeTextarea)
    window.addEventListener('scroll', updateMenuGeometry, true)

    return () => {
      window.removeEventListener('resize', resizeTextarea)
      window.removeEventListener('scroll', updateMenuGeometry, true)
    }
  }, [open, resizeTextarea, updateMenuGeometry])

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

  const menuStyle = {
    left: `${menuGeometry.left}px`,
    top: `${menuGeometry.top}px`,
  } satisfies CSSProperties

  const handleConfirm = useCallback(() => {
    onConfirm(value)
  }, [onConfirm, value])

  const handleOpen = useCallback(() => {
    const nextSourceText = onOpen()

    setValue(nextSourceText ?? sourceText)
  }, [onOpen, sourceText])

  const handleKeyDown = (event: ReactKeyboardEvent) => {
    event.stopPropagation()

    if (
      eventMatchesShortcutAction(
        event.nativeEvent,
        shortcutBindings,
        shortcutActionIds.toolbarClose,
      )
    ) {
      event.preventDefault()
      onCancel()
      return
    }

    if (
      eventMatchesShortcutAction(
        event.nativeEvent,
        shortcutBindings,
        shortcutActionIds.toolbarConfirmEdit,
      )
    ) {
      event.preventDefault()
      handleConfirm()
    }
  }

  return (
    <>
      <ToolbarButton
        ref={triggerRef}
        active={open}
        ariaExpanded={open}
        ariaHasPopup="dialog"
        ariaLabel={t('toolbar.editSelectedMarkdown')}
        onClick={handleOpen}
        onTooltipHide={onTooltipHide}
        onTooltipShow={onTooltipShow}
        tooltip={{ label: t('common.edit'), shortcut: triggerShortcut }}
      >
        <ToolbarIcon name="edit" />
      </ToolbarButton>

      {open ? (
        <div
          ref={menuRef}
          className={`preview-edit-menu place-${menuGeometry.placement}`}
          data-toolbar-popup="true"
          data-preview-edit-menu="true"
          role="dialog"
          aria-label={t('toolbar.editSelectedMarkdownSource')}
          style={menuStyle}
          onKeyDown={handleKeyDown}
        >
          <textarea
            ref={textareaRef}
            className="preview-edit-textbox"
            value={value}
            rows={1}
            spellCheck={false}
            onChange={(event) => {
              setValue(event.target.value)
            }}
            onKeyDown={handleKeyDown}
          />
          <div className="preview-edit-actions">
            <button
              type="button"
              className="preview-edit-action preview-edit-action-secondary"
              onClick={onCancel}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="preview-edit-action preview-edit-action-primary"
              onClick={handleConfirm}
            >
              {t('common.confirm')}
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default PreviewEditMenu
