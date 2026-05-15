import { forwardRef, type CSSProperties } from 'react'
import './ToolbarTooltip.css'

export type ToolbarTooltipContent = {
  label: string
  shortcut?: string
}

export type ToolbarTooltipPlacement = 'top' | 'bottom'

type ToolbarTooltipProps = ToolbarTooltipContent & {
  arrowLeft: number
  left: number
  placement: ToolbarTooltipPlacement
  top: number
  visible: boolean
}

const ToolbarTooltip = forwardRef<HTMLDivElement, ToolbarTooltipProps>(
  function ToolbarTooltip(
    { arrowLeft, label, left, placement, shortcut, top, visible },
    ref,
  ) {
    const style = {
      '--markdown-toolbar-tooltip-arrow-left': `${arrowLeft}px`,
      left: `${left}px`,
      top: `${top}px`,
    } as CSSProperties

    return (
      <div
        ref={ref}
        className={`markdown-toolbar-tooltip is-${placement}${
          visible ? ' is-visible' : ''
        }`}
        style={style}
        role="tooltip"
      >
        <span className="markdown-toolbar-tooltip-arrow" aria-hidden="true" />
        <span className="markdown-toolbar-tooltip-label">{label}</span>
        {shortcut ? (
          <span className="markdown-toolbar-tooltip-shortcut">{shortcut}</span>
        ) : null}
      </div>
    )
  },
)

export default ToolbarTooltip
