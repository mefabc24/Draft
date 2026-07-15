import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'
import type { CalloutType } from '../../markdown/callouts'
import { useTranslation } from '../../localization/useTranslation'
import { clamp } from '../../shared/utils/clamp'
import {
  coreToolbarCalloutOptions,
  extraToolbarCalloutOptions,
} from '../calloutOptions'
import CalloutSubmenuItem from './CalloutSubmenuItem'

type CalloutSubmenuProps = {
  anchorRef: RefObject<HTMLElement | null>
  onSelect: (calloutType: CalloutType) => void
  selectedCalloutType: CalloutType | null
}

type BoundaryRect = {
  bottom: number
  left: number
  right: number
  top: number
}

type CalloutSubmenuGeometry = {
  left: number
  maxHeight?: number
  side: 'left' | 'right'
  top: number
}

const CALLOUT_SUBMENU_EDGE_PADDING = 8
const CALLOUT_SUBMENU_GAP = 8
const CALLOUT_SUBMENU_ITEM_INSET = 8

function getViewportBoundaryRect(): BoundaryRect {
  return {
    bottom: window.innerHeight,
    left: 0,
    right: window.innerWidth,
    top: 0,
  }
}

function getCalloutSubmenuBoundaryRect(anchor: HTMLElement): BoundaryRect {
  return (
    anchor.closest('.workspace')?.getBoundingClientRect() ??
    anchor.closest('.editor-body')?.getBoundingClientRect() ??
    getViewportBoundaryRect()
  )
}

function ExpandChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`markdown-toolbar-callout-expand-chevron${
        expanded ? ' is-expanded' : ''
      }`}
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

function CalloutSubmenu({
  anchorRef,
  onSelect,
  selectedCalloutType,
}: CalloutSubmenuProps) {
  const { t } = useTranslation()
  const submenuRef = useRef<HTMLDivElement | null>(null)
  const geometryFrameRef = useRef<number | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [geometry, setGeometry] = useState<CalloutSubmenuGeometry | null>(null)
  const promotedExtraCalloutOption = !expanded
    ? (extraToolbarCalloutOptions.find(
        (option) => option.type === selectedCalloutType,
      ) ?? null)
    : null

  const updateGeometry = useCallback(() => {
    const anchor = anchorRef.current
    const submenu = submenuRef.current

    if (!anchor || !submenu) {
      return
    }

    const anchorRect = anchor.getBoundingClientRect()
    const boundaryRect = getCalloutSubmenuBoundaryRect(anchor)
    const submenuWidth = submenu.offsetWidth
    const naturalSubmenuHeight = submenu.scrollHeight
    const minLeft = boundaryRect.left + CALLOUT_SUBMENU_EDGE_PADDING
    const maxLeft =
      boundaryRect.right - submenuWidth - CALLOUT_SUBMENU_EDGE_PADDING
    const availableRight =
      boundaryRect.right -
      anchorRect.right -
      CALLOUT_SUBMENU_GAP -
      CALLOUT_SUBMENU_EDGE_PADDING
    const availableLeft =
      anchorRect.left -
      boundaryRect.left -
      CALLOUT_SUBMENU_GAP -
      CALLOUT_SUBMENU_EDGE_PADDING
    const side =
      submenuWidth > availableRight && availableLeft > availableRight
        ? 'left'
        : 'right'
    const preferredLeft =
      side === 'right'
        ? anchorRect.right + CALLOUT_SUBMENU_GAP
        : anchorRect.left - submenuWidth - CALLOUT_SUBMENU_GAP
    const availableHeight = Math.max(
      0,
      boundaryRect.bottom -
        boundaryRect.top -
        CALLOUT_SUBMENU_EDGE_PADDING * 2,
    )
    const maxHeight =
      naturalSubmenuHeight > availableHeight ? availableHeight : undefined
    const clampedHeight = Math.min(
      naturalSubmenuHeight,
      maxHeight ?? naturalSubmenuHeight,
    )
    const minTop = boundaryRect.top + CALLOUT_SUBMENU_EDGE_PADDING
    const maxTop =
      boundaryRect.bottom - clampedHeight - CALLOUT_SUBMENU_EDGE_PADDING
    const preferredTop = anchorRect.top - CALLOUT_SUBMENU_ITEM_INSET

    const nextGeometry = {
      left: clamp(preferredLeft, minLeft, maxLeft),
      maxHeight,
      side,
      top: clamp(preferredTop, minTop, maxTop),
    } satisfies CalloutSubmenuGeometry

    setGeometry((currentGeometry) => {
      if (
        currentGeometry &&
        currentGeometry.left === nextGeometry.left &&
        currentGeometry.maxHeight === nextGeometry.maxHeight &&
        currentGeometry.side === nextGeometry.side &&
        currentGeometry.top === nextGeometry.top
      ) {
        return currentGeometry
      }

      return nextGeometry
    })
  }, [anchorRef])

  const scheduleGeometryUpdate = useCallback(() => {
    if (geometryFrameRef.current !== null) {
      window.cancelAnimationFrame(geometryFrameRef.current)
    }

    geometryFrameRef.current = window.requestAnimationFrame(() => {
      geometryFrameRef.current = null
      updateGeometry()
    })
  }, [updateGeometry])

  useLayoutEffect(() => {
    updateGeometry()
  }, [expanded, selectedCalloutType, updateGeometry])

  useEffect(() => {
    scheduleGeometryUpdate()

    window.addEventListener('resize', updateGeometry)
    window.addEventListener('scroll', updateGeometry, true)

    return () => {
      if (geometryFrameRef.current !== null) {
        window.cancelAnimationFrame(geometryFrameRef.current)
        geometryFrameRef.current = null
      }

      window.removeEventListener('resize', updateGeometry)
      window.removeEventListener('scroll', updateGeometry, true)
    }
  }, [scheduleGeometryUpdate, updateGeometry])

  useEffect(() => {
    const submenu = submenuRef.current

    if (!submenu) {
      return
    }

    const resizeObserver = new ResizeObserver(scheduleGeometryUpdate)

    resizeObserver.observe(submenu)

    return () => {
      resizeObserver.disconnect()
    }
  }, [scheduleGeometryUpdate])

  const submenuStyle = geometry
    ? ({
        left: `${Math.round(geometry.left)}px`,
        maxHeight: geometry.maxHeight ? `${geometry.maxHeight}px` : undefined,
        top: `${Math.round(geometry.top)}px`,
      } satisfies CSSProperties)
    : ({
        visibility: 'hidden',
      } satisfies CSSProperties)

  return (
    <div
      ref={submenuRef}
      className={`markdown-toolbar-callout-submenu${
        geometry ? ` open-${geometry.side}` : ''
      }`}
      role="menu"
      aria-label={t('toolbar.blockquoteCallouts')}
      style={submenuStyle}
    >
      <div className="markdown-toolbar-callout-list">
        {coreToolbarCalloutOptions.map((option) => (
          <CalloutSubmenuItem
            key={option.type}
            option={option}
            selected={option.type === selectedCalloutType}
            onSelect={onSelect}
          />
        ))}
        {promotedExtraCalloutOption ? (
          <CalloutSubmenuItem
            key={`promoted-${promotedExtraCalloutOption.type}`}
            option={promotedExtraCalloutOption}
            selected
            onSelect={onSelect}
          />
        ) : null}
        <div
          className={`markdown-toolbar-callout-extra-frame${
            expanded ? ' is-expanded' : ''
          }`}
        >
          <div className="markdown-toolbar-callout-extra-list">
            {extraToolbarCalloutOptions.map((option) => (
              <CalloutSubmenuItem
                key={option.type}
                option={option}
                selected={option.type === selectedCalloutType}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
        <button
          type="button"
          className="markdown-toolbar-callout-expand-button"
          aria-label={
            expanded
              ? t('quickInsert.hideExtraCallouts')
              : t('quickInsert.showExtraCallouts')
          }
          aria-expanded={expanded}
          onClick={() => {
            setExpanded((currentExpanded) => !currentExpanded)
          }}
        >
          <ExpandChevron expanded={expanded} />
        </button>
      </div>
    </div>
  )
}

export default CalloutSubmenu
