import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import {
  applyCalloutBlockquoteStyle,
  applyHeadingStyle,
  applyListStyle,
  toggleImageSelection,
  toggleLinkSelection,
  toggleWrappedSelection,
} from '../../editor/monaco/markdownCommandAdapter'
import type { HeadingValue, ListValue } from '../../markdown'
import type { CalloutType } from '../../markdown/callouts'
import { clamp } from '../../shared/utils/clamp'
import { useFloatingToolbarState } from '../hooks/useFloatingToolbarState'
import { useToolbarTooltip } from '../hooks/useToolbarTooltip'
import {
  headingItems,
  headingLabels,
  headingShortcuts,
  inlineToolbarActions,
  listIcons,
  listItems,
  listLabels,
} from '../toolbarConfig'
import type { InlineToolbarAction } from '../toolbarConfig'
import type {
  FloatingMarkdownToolbarProps,
  ToolbarPosition,
} from '../toolbarTypes'
import CalloutSubmenu from './CalloutSubmenu'
import LinkEditMenu from './LinkEditMenu'
import PreviewEditMenu from './PreviewEditMenu'
import ToolbarButton from './ToolbarButton'
import ToolbarDropdown, {
  type ToolbarDropdownSubmenuRenderProps,
} from './ToolbarDropdown'
import ToolbarIcon from './ToolbarIcon'
import ToolbarTooltip from './ToolbarTooltip'
import '../styles/floatingMarkdownToolbar.css'

type ExtraToolsStyle = CSSProperties & {
  '--markdown-toolbar-extra-tools-width': string
}

const TOOLBAR_EDGE_PADDING = 8
const TOOLBAR_BUTTON_WIDTH = 36
const TOOLBAR_BUTTON_GAP = 8
const TOOLBAR_EXTRA_TOOLS_TRANSITION_MS = 190

const primaryInlineToolbarActions = inlineToolbarActions.filter(
  (action) => action.visibility === 'primary',
)
const extraInlineToolbarActions = inlineToolbarActions.filter(
  (action) => action.visibility === 'extra',
)

function isToolbarPopupTarget(target: EventTarget | null) {
  const element =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null

  return !!element?.closest('[data-toolbar-popup]')
}

function getExtraToolsWidth(actionCount: number) {
  if (actionCount <= 0) {
    return 0
  }

  return (
    actionCount * TOOLBAR_BUTTON_WIDTH +
    (actionCount - 1) * TOOLBAR_BUTTON_GAP
  )
}

function getToolbarActionGroupWidth(actionCount: number) {
  if (actionCount <= 0) {
    return 0
  }

  return (
    actionCount * TOOLBAR_BUTTON_WIDTH +
    (actionCount - 1) * TOOLBAR_BUTTON_GAP
  )
}

function getPromotedToolsWidth(primaryCount: number, promotedCount: number) {
  if (promotedCount <= 0) {
    return 0
  }

  return (
    getToolbarActionGroupWidth(primaryCount + promotedCount) -
    getToolbarActionGroupWidth(primaryCount)
  )
}

function getExpandedExtraToolsOuterWidth(actionCount: number) {
  const toolsWidth = getExtraToolsWidth(actionCount)

  return toolsWidth > 0 ? toolsWidth + TOOLBAR_BUTTON_GAP : 0
}

function MoreToolsChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`markdown-toolbar-expand-chevron${
        expanded ? ' is-expanded' : ''
      }`}
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

function FloatingMarkdownToolbar({
  editor,
  editorBodyRef,
  onRequestEditorMode,
  previewContentRef,
  previewScrollElementRef,
  toolbarMode,
  viewMode,
  workspaceRef,
}: FloatingMarkdownToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const toolbarBoundsFrameRef = useRef<number | null>(null)
  const toolbarProjectedWidthRef = useRef<number | null>(null)
  const toolbarProjectionTimeoutRef = useRef<number | null>(null)
  const [position, setPosition] = useState<ToolbarPosition | null>(null)
  const [extraToolsExpanded, setExtraToolsExpanded] = useState(false)
  const {
    activeTooltip,
    clearToolbarTooltip,
    hideToolbarTooltip,
    showToolbarTooltip,
    tooltipRef,
  } = useToolbarTooltip({
    toolbarPosition: position,
    toolbarRef,
    workspaceRef,
  })
  const {
    activeFormats,
    calloutType,
    headingValue,
    imageEdit,
    listValue,
    linkEdit,
    markToolbarInteraction,
    openDropdown,
    previewEdit,
    runEditorCommand,
    setOpenDropdown,
  } = useFloatingToolbarState({
    clearToolbarTooltip,
    editor,
    editorBodyRef,
    hideToolbarTooltip,
    onRequestEditorMode,
    position,
    previewContentRef,
    previewScrollElementRef,
    setPosition,
    toolbarMode,
    toolbarRef,
    viewMode,
    workspaceRef,
  })
  const closePreviewEditMenu = previewEdit.close
  const closeLinkEditMenu = linkEdit.close
  const closeImageEditMenu = imageEdit.close
  const toolbarVisible = position !== null
  const toolbarStyle = useMemo(
    () =>
      position
        ? ({
            left: `${Math.round(position.left)}px`,
            top: `${Math.round(position.top)}px`,
          }) satisfies CSSProperties
        : undefined,
    [position],
  )
  const handleHeadingSelect = useCallback(
    (value: string) => {
      runEditorCommand((activeEditor, commandOptions) => {
        applyHeadingStyle(activeEditor, value as HeadingValue, commandOptions)
      })
    },
    [runEditorCommand],
  )
  const handleHeadingOpenChange = useCallback(
    (open: boolean) => {
      hideToolbarTooltip()
      closePreviewEditMenu()
      closeLinkEditMenu()
      closeImageEditMenu()
      setOpenDropdown(open ? 'heading' : null)
    },
    [
      closeImageEditMenu,
      closeLinkEditMenu,
      closePreviewEditMenu,
      hideToolbarTooltip,
      setOpenDropdown,
    ],
  )
  const handleListOpenChange = useCallback(
    (open: boolean) => {
      hideToolbarTooltip()
      closePreviewEditMenu()
      closeLinkEditMenu()
      closeImageEditMenu()
      setOpenDropdown(open ? 'list' : null)
    },
    [
      closeImageEditMenu,
      closeLinkEditMenu,
      closePreviewEditMenu,
      hideToolbarTooltip,
      setOpenDropdown,
    ],
  )
  const headingTooltip = useMemo(
    () => ({
      label: headingLabels[headingValue],
      shortcut: headingShortcuts[headingValue],
    }),
    [headingValue],
  )
  const listTooltip = useMemo(
    () => ({
      label: listLabels[listValue],
    }),
    [listValue],
  )
  const extraToolCount =
    extraInlineToolbarActions.length + (previewEdit.available ? 1 : 0)
  const promotedExtraInlineToolbarActions = !extraToolsExpanded
    ? extraInlineToolbarActions.filter(
        (action) => activeFormats[action.activeFormat],
      )
    : []
  const promotedPreviewEdit = !extraToolsExpanded && previewEdit.open
  const extraToolsStyle = useMemo(
    () =>
      ({
        '--markdown-toolbar-extra-tools-width': `${getExtraToolsWidth(
          extraToolCount,
        )}px`,
      }) as ExtraToolsStyle,
    [extraToolCount],
  )
  useEffect(() => {
    if (!toolbarVisible) {
      setExtraToolsExpanded(false)
    }
  }, [toolbarVisible])
  const clampToolbarPositionToFrame = useCallback(() => {
    const toolbar = toolbarRef.current
    const workspace = workspaceRef.current

    if (!toolbar || !workspace) {
      return
    }

    setPosition((currentPosition) => {
      if (!currentPosition) {
        return currentPosition
      }

      const targetLeft = currentPosition.preferredLeft ?? currentPosition.left
      const toolbarWidth = toolbarProjectedWidthRef.current ?? toolbar.offsetWidth
      const nextLeft = clamp(
        targetLeft,
        TOOLBAR_EDGE_PADDING,
        workspace.clientWidth - toolbarWidth - TOOLBAR_EDGE_PADDING,
      )

      if (nextLeft === currentPosition.left) {
        return currentPosition
      }

      return {
        ...currentPosition,
        left: nextLeft,
      }
    })
  }, [workspaceRef])
  const scheduleToolbarBoundsUpdate = useCallback(() => {
    if (toolbarBoundsFrameRef.current !== null) {
      window.cancelAnimationFrame(toolbarBoundsFrameRef.current)
    }

    toolbarBoundsFrameRef.current = window.requestAnimationFrame(() => {
      toolbarBoundsFrameRef.current = null
      clampToolbarPositionToFrame()
    })
  }, [clampToolbarPositionToFrame])
  useEffect(() => {
    if (!toolbarVisible) {
      return
    }

    scheduleToolbarBoundsUpdate()
  }, [
    extraToolsExpanded,
    position?.preferredLeft,
    position?.top,
    promotedExtraInlineToolbarActions.length,
    promotedPreviewEdit,
    scheduleToolbarBoundsUpdate,
    toolbarVisible,
  ])
  useEffect(() => {
    const toolbar = toolbarRef.current
    const workspace = workspaceRef.current

    if (!toolbarVisible || !toolbar || !workspace) {
      return
    }

    const resizeObserver = new ResizeObserver(scheduleToolbarBoundsUpdate)
    resizeObserver.observe(toolbar)
    resizeObserver.observe(workspace)
    scheduleToolbarBoundsUpdate()

    return () => {
      resizeObserver.disconnect()
    }
  }, [scheduleToolbarBoundsUpdate, toolbarVisible, workspaceRef])
  useEffect(
    () => () => {
      if (toolbarBoundsFrameRef.current !== null) {
        window.cancelAnimationFrame(toolbarBoundsFrameRef.current)
        toolbarBoundsFrameRef.current = null
      }

      if (toolbarProjectionTimeoutRef.current !== null) {
        window.clearTimeout(toolbarProjectionTimeoutRef.current)
        toolbarProjectionTimeoutRef.current = null
      }
    },
    [],
  )
  const handleListSelect = useCallback(
    (value: string) => {
      runEditorCommand((activeEditor, commandOptions) => {
        applyListStyle(activeEditor, value as ListValue, commandOptions)
      })
    },
    [runEditorCommand],
  )
  const handleCalloutSelect = useCallback(
    (calloutType: CalloutType) => {
      runEditorCommand((activeEditor, commandOptions) => {
        applyCalloutBlockquoteStyle(
          activeEditor,
          calloutType,
          commandOptions,
        )
      })
    },
    [runEditorCommand],
  )
  const renderHeadingSubmenu = useCallback(
    (
      submenuId: string,
      { anchorRef, closeMenu }: ToolbarDropdownSubmenuRenderProps,
    ) => {
      if (submenuId !== 'callouts') {
        return null
      }

      return (
        <CalloutSubmenu
          anchorRef={anchorRef}
          selectedCalloutType={calloutType}
          onSelect={(calloutType) => {
            handleCalloutSelect(calloutType)
            closeMenu()
          }}
        />
      )
    },
    [calloutType, handleCalloutSelect],
  )
  const handleExtraToolsToggle = useCallback(() => {
    const toolbar = toolbarRef.current
    const workspace = workspaceRef.current
    const expanding = !extraToolsExpanded

    closePreviewEditMenu()
    closeLinkEditMenu()
    closeImageEditMenu()
    setOpenDropdown(null)

    if (toolbar && workspace) {
      const currentWidth = toolbar.offsetWidth
      const expandedExtraWidth = getExpandedExtraToolsOuterWidth(extraToolCount)
      const activeExtraToolCount = extraInlineToolbarActions.filter(
        (action) => activeFormats[action.activeFormat],
      ).length
      const currentPromotedCount =
        promotedExtraInlineToolbarActions.length + (promotedPreviewEdit ? 1 : 0)
      const nextPromotedCount = expanding ? 0 : activeExtraToolCount
      const currentPromotedWidth = getPromotedToolsWidth(
        primaryInlineToolbarActions.length,
        currentPromotedCount,
      )
      const nextPromotedWidth = getPromotedToolsWidth(
        primaryInlineToolbarActions.length,
        nextPromotedCount,
      )
      const projectedWidth = expanding
        ? currentWidth + expandedExtraWidth - currentPromotedWidth
        : currentWidth - expandedExtraWidth + nextPromotedWidth

      toolbarProjectedWidthRef.current = projectedWidth

      if (toolbarProjectionTimeoutRef.current !== null) {
        window.clearTimeout(toolbarProjectionTimeoutRef.current)
      }

      toolbarProjectionTimeoutRef.current = window.setTimeout(() => {
        toolbarProjectedWidthRef.current = null
        toolbarProjectionTimeoutRef.current = null
        scheduleToolbarBoundsUpdate()
      }, TOOLBAR_EXTRA_TOOLS_TRANSITION_MS + 40)

      setPosition((currentPosition) => {
        if (!currentPosition) {
          return currentPosition
        }

        const targetLeft = currentPosition.preferredLeft ?? currentPosition.left
        const nextLeft = clamp(
          targetLeft,
          TOOLBAR_EDGE_PADDING,
          workspace.clientWidth - projectedWidth - TOOLBAR_EDGE_PADDING,
        )

        if (nextLeft === currentPosition.left) {
          return currentPosition
        }

        return {
          ...currentPosition,
          left: nextLeft,
        }
      })
    }

    setExtraToolsExpanded((expanded) => !expanded)
  }, [
    activeFormats,
    closeImageEditMenu,
    closeLinkEditMenu,
    closePreviewEditMenu,
    extraToolCount,
    extraToolsExpanded,
    promotedExtraInlineToolbarActions.length,
    promotedPreviewEdit,
    scheduleToolbarBoundsUpdate,
    setOpenDropdown,
    workspaceRef,
  ])
  const renderInlineToolbarAction = (action: InlineToolbarAction) => {
    const active = activeFormats[action.activeFormat]
    const command = action.command

    if (command.type === 'link') {
      return linkEdit.available ? (
        <LinkEditMenu
          key={action.id}
          active={active}
          initialState={linkEdit.initialState}
          open={linkEdit.open}
          toolbarRef={toolbarRef}
          workspaceRef={workspaceRef}
          onCancel={linkEdit.cancel}
          onClose={linkEdit.close}
          onConfirm={linkEdit.confirm}
          onOpen={linkEdit.openMenu}
          onTooltipHide={hideToolbarTooltip}
          onTooltipShow={showToolbarTooltip}
        />
      ) : (
        <ToolbarButton
          key={action.id}
          ariaLabel={action.ariaLabel}
          active={active}
          onTooltipHide={hideToolbarTooltip}
          onTooltipShow={showToolbarTooltip}
          onClick={() => runEditorCommand(toggleLinkSelection)}
          tooltip={action.tooltip}
        >
          <ToolbarIcon name={action.icon} />
        </ToolbarButton>
      )
    }

    if (command.type === 'image') {
      return imageEdit.available ? (
        <LinkEditMenu
          key={action.id}
          active={active}
          initialState={imageEdit.initialState}
          kind="image"
          open={imageEdit.open}
          toolbarRef={toolbarRef}
          workspaceRef={workspaceRef}
          onCancel={imageEdit.cancel}
          onClose={imageEdit.close}
          onConfirm={imageEdit.confirm}
          onOpen={imageEdit.openMenu}
          onTooltipHide={hideToolbarTooltip}
          onTooltipShow={showToolbarTooltip}
        />
      ) : (
        <ToolbarButton
          key={action.id}
          ariaLabel={action.ariaLabel}
          active={active}
          onTooltipHide={hideToolbarTooltip}
          onTooltipShow={showToolbarTooltip}
          onClick={() => runEditorCommand(toggleImageSelection)}
          tooltip={action.tooltip}
        >
          <ToolbarIcon name={action.icon} />
        </ToolbarButton>
      )
    }

    if (command.type !== 'wrap') {
      return null
    }

    return (
      <ToolbarButton
        key={action.id}
        ariaLabel={action.ariaLabel}
        active={active}
        onTooltipHide={hideToolbarTooltip}
        onTooltipShow={showToolbarTooltip}
        onClick={() =>
          runEditorCommand((activeEditor, commandOptions) => {
            toggleWrappedSelection(
              activeEditor,
              command.prefix,
              command.suffix,
              commandOptions,
            )
          })
        }
        tooltip={action.tooltip}
      >
        <ToolbarIcon name={action.icon} />
      </ToolbarButton>
    )
  }
  const renderPreviewEditMenu = () =>
    previewEdit.available ? (
      <PreviewEditMenu
        open={previewEdit.open}
        sourceText={previewEdit.sourceText}
        toolbarRef={toolbarRef}
        workspaceRef={workspaceRef}
        onCancel={previewEdit.cancel}
        onClose={previewEdit.close}
        onConfirm={previewEdit.confirm}
        onOpen={previewEdit.openMenu}
        onTooltipHide={hideToolbarTooltip}
        onTooltipShow={showToolbarTooltip}
      />
    ) : null

  if (!editor || !position) {
    return null
  }

  return (
    <div
      ref={toolbarRef}
      className="floating-markdown-toolbar"
      style={toolbarStyle}
      role="toolbar"
      aria-label="Markdown formatting"
      onPointerDownCapture={(event) => {
        markToolbarInteraction()
        hideToolbarTooltip()
        if (!isToolbarPopupTarget(event.target)) {
          event.preventDefault()
        }
      }}
      onMouseDownCapture={(event) => {
        markToolbarInteraction()
        hideToolbarTooltip()
        if (!isToolbarPopupTarget(event.target)) {
          event.preventDefault()
        }
      }}
    >
      <ToolbarDropdown
        className="heading-dropdown"
        ariaLabel="Select text style"
        menuLabel="Text styles"
        items={headingItems}
        open={openDropdown === 'heading'}
        onOpenChange={handleHeadingOpenChange}
        onTooltipHide={hideToolbarTooltip}
        onTooltipShow={showToolbarTooltip}
        selectedValue={headingValue}
        triggerTooltip={headingTooltip}
        triggerLabel={headingLabels[headingValue]}
        onSelect={handleHeadingSelect}
        renderSubmenu={renderHeadingSubmenu}
      />

      <div className="markdown-toolbar-divider" aria-hidden="true" />

      <div className="markdown-toolbar-format-tools">
        <div className="markdown-toolbar-primary-tools">
          {primaryInlineToolbarActions.map(renderInlineToolbarAction)}
          {promotedExtraInlineToolbarActions.map(renderInlineToolbarAction)}
          {promotedPreviewEdit ? renderPreviewEditMenu() : null}
        </div>
        <div
          className={`markdown-toolbar-extra-tools${
            extraToolsExpanded ? ' is-expanded' : ''
          }`}
          aria-hidden={!extraToolsExpanded}
          style={extraToolsStyle}
        >
          <div className="markdown-toolbar-extra-tools-inner">
            {extraInlineToolbarActions.map(renderInlineToolbarAction)}
            {promotedPreviewEdit ? null : renderPreviewEditMenu()}
          </div>
        </div>
        <ToolbarButton
          active={false}
          ariaExpanded={extraToolsExpanded}
          ariaLabel={
            extraToolsExpanded ? 'Hide extra tools' : 'Show more tools'
          }
          className="markdown-toolbar-expand-button"
          onTooltipHide={hideToolbarTooltip}
          onTooltipShow={showToolbarTooltip}
          onClick={handleExtraToolsToggle}
          tooltip={{
            label: extraToolsExpanded ? 'Hide extra tools' : 'Show more tools',
          }}
        >
          <MoreToolsChevron expanded={extraToolsExpanded} />
        </ToolbarButton>
      </div>

      <div className="markdown-toolbar-divider" aria-hidden="true" />

      <ToolbarDropdown
        align="right"
        className="list-dropdown"
        ariaLabel={`List style: ${listLabels[listValue]}`}
        menuLabel="List styles"
        items={listItems}
        open={openDropdown === 'list'}
        onOpenChange={handleListOpenChange}
        onTooltipHide={hideToolbarTooltip}
        onTooltipShow={showToolbarTooltip}
        selectedValue={listValue}
        triggerIcon={<ToolbarIcon name={listIcons[listValue]} />}
        triggerLabel=""
        triggerTooltip={listTooltip}
        onSelect={handleListSelect}
      />
      {activeTooltip ? (
        <ToolbarTooltip
          ref={tooltipRef}
          arrowLeft={activeTooltip.arrowLeft}
          label={activeTooltip.label}
          left={activeTooltip.left}
          placement={activeTooltip.placement}
          shortcut={activeTooltip.shortcut}
          top={activeTooltip.top}
          visible={activeTooltip.visible}
        />
      ) : null}
    </div>
  )
}

export default FloatingMarkdownToolbar
