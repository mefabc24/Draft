import type { HTMLAttributes, RefObject } from 'react'

type WorkspaceSplitResizerProps = {
  isResizing: boolean
  resizerProps: HTMLAttributes<HTMLDivElement>
  resizerRef: RefObject<HTMLDivElement | null>
}

function WorkspaceSplitResizer({
  isResizing,
  resizerProps,
  resizerRef,
}: WorkspaceSplitResizerProps) {
  return (
    <div
      ref={resizerRef}
      className="workspace-split-resizer"
      data-dragging={isResizing ? 'true' : 'false'}
      aria-hidden="true"
      {...resizerProps}
    />
  )
}

export default WorkspaceSplitResizer
