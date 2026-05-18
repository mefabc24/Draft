import { forwardRef, type ReactNode } from 'react'
import type { ToolbarTooltipContent } from './ToolbarTooltip'

type ToolbarButtonProps = {
  active?: boolean
  ariaExpanded?: boolean
  ariaHasPopup?: 'dialog' | 'menu'
  ariaLabel: string
  children: ReactNode
  onClick: () => void
  onTooltipHide?: () => void
  onTooltipShow?: (
    target: HTMLButtonElement,
    tooltip: ToolbarTooltipContent,
  ) => void
  tooltip?: ToolbarTooltipContent
}

const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(function ToolbarButton({
  active = false,
  ariaExpanded,
  ariaHasPopup,
  ariaLabel,
  children,
  onClick,
  onTooltipHide,
  onTooltipShow,
  tooltip,
}, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={`markdown-toolbar-button${active ? ' is-active' : ''}`}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      aria-haspopup={ariaHasPopup}
      aria-pressed={active}
      onBlur={onTooltipHide}
      onClick={() => {
        onTooltipHide?.()
        onClick()
      }}
      onFocus={(event) => {
        if (tooltip) {
          onTooltipShow?.(event.currentTarget, tooltip)
        }
      }}
      onMouseEnter={(event) => {
        if (tooltip) {
          onTooltipShow?.(event.currentTarget, tooltip)
        }
      }}
      onMouseLeave={onTooltipHide}
      onPointerDown={onTooltipHide}
    >
      {children}
    </button>
  )
})

export default ToolbarButton
