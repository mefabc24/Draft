import type { ReactNode } from 'react'
import type { ToolbarTooltipContent } from './ToolbarTooltip'

type ToolbarButtonProps = {
  active?: boolean
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

function ToolbarButton({
  active = false,
  ariaLabel,
  children,
  onClick,
  onTooltipHide,
  onTooltipShow,
  tooltip,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      className={`markdown-toolbar-button${active ? ' is-active' : ''}`}
      aria-label={ariaLabel}
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
}

export default ToolbarButton
