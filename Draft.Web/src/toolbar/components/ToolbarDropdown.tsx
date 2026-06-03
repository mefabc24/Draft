import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import { useToolbarMenuScrollbar } from '../hooks/useToolbarMenuScrollbar'
import type { ToolbarTooltipContent } from './ToolbarTooltip'

export type ToolbarDropdownItem = {
  icon?: ReactNode
  label: string
  shortcut?: string
  submenuId?: string
  value: string
}
type ToolbarDropdownSubmenuItem = ToolbarDropdownItem & {
  submenuId: string
}

export type ToolbarDropdownMenuEntry =
  | ToolbarDropdownItem
  | {
      id: string
      type: 'divider'
    }

type ToolbarDropdownProps = {
  align?: 'left' | 'right'
  ariaLabel: string
  className?: string
  items: ToolbarDropdownMenuEntry[]
  menuLabel: string
  onOpenChange: (open: boolean) => void
  onSelect: (value: string) => void
  open: boolean
  renderSubmenu?: (
    submenuId: string,
    props: ToolbarDropdownSubmenuRenderProps,
  ) => ReactNode
  selectedValue: string
  triggerIcon?: ReactNode
  triggerLabel: string
  triggerTooltip?: ToolbarTooltipContent
  onTooltipHide?: () => void
  onTooltipShow?: (
    target: HTMLButtonElement,
    tooltip: ToolbarTooltipContent,
  ) => void
}
export type ToolbarDropdownSubmenuRenderProps = {
  anchorRef: RefObject<HTMLButtonElement | null>
  closeMenu: () => void
  closeSubmenu: () => void
}
type ToolbarMenuPlacement = 'top' | 'bottom'
type ToolbarMenuGeometry = {
  maxHeight?: number
  placement: ToolbarMenuPlacement
}

const MENU_EDGE_PADDING = 8
const MENU_GAP = 8

function isDropdownItem(entry: ToolbarDropdownMenuEntry): entry is ToolbarDropdownItem {
  return !('type' in entry)
}

function getDropdownBoundaryRect(trigger: HTMLElement) {
  const boundaryElement = trigger.closest('.workspace') ?? trigger.closest('.editor-body')

  return (
    boundaryElement?.getBoundingClientRect() ?? {
      bottom: window.innerHeight,
      left: 0,
      right: window.innerWidth,
      top: 0,
    }
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`markdown-toolbar-chevron${open ? ' is-open' : ''}`}
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <path
        d="M4 6.25 8 10l4-3.75"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      className="markdown-toolbar-check"
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <path
        d="m3.5 8.35 2.75 2.65 6.25-6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  )
}

function SubmenuChevronIcon() {
  return (
    <svg
      className="markdown-toolbar-submenu-chevron"
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <path
        d="M6.25 4 10 8l-3.75 4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function ToolbarDropdown({
  align = 'left',
  ariaLabel,
  className = '',
  items,
  menuLabel,
  onOpenChange,
  onSelect,
  open,
  renderSubmenu,
  selectedValue,
  triggerIcon,
  triggerLabel,
  triggerTooltip,
  onTooltipHide,
  onTooltipShow,
}: ToolbarDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const submenuAnchorRef = useRef<HTMLButtonElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const {
    scrollRef: menuScrollRef,
    scrollbarRef: menuScrollbarRef,
    thumbRef: menuScrollbarThumbRef,
    syncScrollbarPosition,
    handleTrackPointerDown,
    handleThumbPointerCancel,
    handleThumbPointerDown,
    handleThumbPointerMove,
    handleThumbPointerUp,
  } = useToolbarMenuScrollbar(open)
  const [menuGeometry, setMenuGeometry] = useState<ToolbarMenuGeometry>({
    placement: 'bottom',
  })
  const [openSubmenuValue, setOpenSubmenuValue] = useState<string | null>(null)

  const updateMenuGeometry = useCallback(() => {
    const menu = menuRef.current
    const menuScroll = menuScrollRef.current
    const trigger = triggerRef.current

    if (!menu || !menuScroll || !trigger) {
      return
    }

    const boundaryRect = getDropdownBoundaryRect(trigger)
    const triggerRect = trigger.getBoundingClientRect()
    const naturalMenuHeight = Math.max(menuScroll.scrollHeight, menu.offsetHeight)
    const availableBelow =
      boundaryRect.bottom - triggerRect.bottom - MENU_GAP - MENU_EDGE_PADDING
    const availableAbove =
      triggerRect.top - boundaryRect.top - MENU_GAP - MENU_EDGE_PADDING
    const placement: ToolbarMenuPlacement =
      naturalMenuHeight > availableBelow && availableAbove > availableBelow
        ? 'top'
        : 'bottom'
    const availableHeight = placement === 'top' ? availableAbove : availableBelow
    const maxHeight =
      naturalMenuHeight > availableHeight
        ? Math.max(0, availableHeight)
        : undefined

    setMenuGeometry((currentGeometry) => {
      if (
        currentGeometry.placement === placement &&
        currentGeometry.maxHeight === maxHeight
      ) {
        return currentGeometry
      }

      return { maxHeight, placement }
    })
  }, [menuScrollRef])

  useEffect(() => {
    if (!open) {
      setOpenSubmenuValue(null)
      return
    }

    const frameId = window.requestAnimationFrame(updateMenuGeometry)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [open, updateMenuGeometry])

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target

      if (target instanceof Node && dropdownRef.current?.contains(target)) {
        return
      }

      setOpenSubmenuValue(null)
      onOpenChange(false)
    }

    document.addEventListener('pointerdown', handlePointerDown, true)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [onOpenChange, open])

  useEffect(() => {
    if (!open) {
      return
    }

    const frameId = window.requestAnimationFrame(syncScrollbarPosition)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [menuGeometry.maxHeight, open, syncScrollbarPosition])

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

  const menuStyle = {
    maxHeight: menuGeometry.maxHeight
      ? `${menuGeometry.maxHeight}px`
      : undefined,
  } satisfies CSSProperties
  const closeSubmenu = useCallback(() => {
    setOpenSubmenuValue(null)
  }, [])
  const closeMenu = useCallback(() => {
    setOpenSubmenuValue(null)
    onOpenChange(false)
  }, [onOpenChange])
  const openSubmenuEntry = items.find(
    (entry): entry is ToolbarDropdownSubmenuItem =>
      isDropdownItem(entry) &&
      !!entry.submenuId &&
      entry.value === openSubmenuValue,
  )

  return (
    <div
      ref={dropdownRef}
      className={`markdown-toolbar-dropdown ${className}`.trim()}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`markdown-toolbar-dropdown-trigger${open ? ' is-open' : ''}`}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        onBlur={onTooltipHide}
        onClick={() => {
          onTooltipHide?.()
          onOpenChange(!open)
        }}
        onFocus={(event) => {
          if (!open && triggerTooltip) {
            onTooltipShow?.(event.currentTarget, triggerTooltip)
          }
        }}
        onMouseEnter={(event) => {
          if (!open && triggerTooltip) {
            onTooltipShow?.(event.currentTarget, triggerTooltip)
          }
        }}
        onMouseLeave={onTooltipHide}
        onPointerDown={onTooltipHide}
      >
        {triggerIcon ? (
          <span className="markdown-toolbar-trigger-icon">{triggerIcon}</span>
        ) : null}
        <span className="markdown-toolbar-trigger-label">{triggerLabel}</span>
        <ChevronIcon open={open} />
      </button>

      {open ? (
        <div
          ref={menuRef}
          className={`markdown-toolbar-menu align-${align} place-${menuGeometry.placement}`}
          role="menu"
          aria-label={menuLabel}
          style={menuStyle}
        >
          <div
            ref={menuScrollRef}
            className="markdown-toolbar-menu-scroll"
            data-scrollable="false"
          >
            {items.map((entry) => {
              if (!isDropdownItem(entry)) {
                return (
                  <div
                    key={entry.id}
                    className="markdown-toolbar-menu-divider"
                    role="separator"
                  />
                )
              }

              const selected = entry.value === selectedValue
              const hasSubmenu = !!entry.submenuId
              const submenuOpen = openSubmenuValue === entry.value

              return (
                <button
                  key={entry.value}
                  ref={submenuOpen ? submenuAnchorRef : undefined}
                  type="button"
                  className={`markdown-toolbar-menu-item${
                    selected ? ' is-selected' : ''
                  }${entry.icon ? ' has-icon' : ' no-icon'}${
                    hasSubmenu ? ' has-submenu' : ''
                  }${submenuOpen ? ' is-submenu-open' : ''}`}
                  role={hasSubmenu ? 'menuitem' : 'menuitemradio'}
                  aria-checked={hasSubmenu ? undefined : selected}
                  aria-expanded={hasSubmenu ? submenuOpen : undefined}
                  aria-haspopup={hasSubmenu ? 'menu' : undefined}
                  onClick={() => {
                    onTooltipHide?.()
                    if (hasSubmenu) {
                      setOpenSubmenuValue((currentValue) =>
                        currentValue === entry.value ? null : entry.value,
                      )
                      return
                    }

                    onSelect(entry.value)
                    onOpenChange(false)
                  }}
                >
                  {entry.icon ? (
                    <span className="markdown-toolbar-item-icon">{entry.icon}</span>
                  ) : null}
                  <span className="markdown-toolbar-item-label">{entry.label}</span>
                  {entry.shortcut ? (
                    <span className="markdown-toolbar-item-shortcut">
                      {entry.shortcut}
                    </span>
                  ) : null}
                  {hasSubmenu ? (
                    <span className="markdown-toolbar-item-submenu">
                      <SubmenuChevronIcon />
                    </span>
                  ) : (
                    <span className="markdown-toolbar-item-check">
                      {selected ? <CheckIcon /> : null}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {openSubmenuEntry && renderSubmenu
            ? renderSubmenu(openSubmenuEntry.submenuId, {
                anchorRef: submenuAnchorRef,
                closeMenu,
                closeSubmenu,
              })
            : null}
          <div
            ref={menuScrollbarRef}
            className="markdown-toolbar-menu-scrollbar"
            data-dragging="false"
            data-scrollable="false"
            aria-hidden="true"
            onPointerDown={handleTrackPointerDown}
          >
            <div
              ref={menuScrollbarThumbRef}
              className="markdown-toolbar-menu-scrollbar-thumb"
              onPointerCancel={handleThumbPointerCancel}
              onPointerDown={handleThumbPointerDown}
              onPointerMove={handleThumbPointerMove}
              onPointerUp={handleThumbPointerUp}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default ToolbarDropdown
