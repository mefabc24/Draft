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
import { transformSelectedTextCase } from '../../editor/monaco/textCasing'
import type { HeadingValue, ListValue } from '../../markdown'
import type { CalloutType } from '../../markdown/callouts'
import { useTranslation } from '../../localization/useTranslation'
import type {
  FloatingMarkdownToolbarItemCustomization,
  MenuItemPlacement,
} from '../../settings/menuCustomization'
import {
  formatShortcutForDisplay,
  getShortcutBinding,
  shortcutActionIds,
  type ShortcutActionId,
} from '../../shortcuts/shortcutSettings'
import { clamp } from '../../shared/utils/clamp'
import { useFloatingToolbarState } from '../hooks/useFloatingToolbarState'
import { useToolbarTooltip } from '../hooks/useToolbarTooltip'
import {
  headingItems,
  headingLabelKeys,
  inlineTooltipLabelKeys,
  inlineToolbarActions,
  listIcons,
  listItems,
  listLabelKeys,
  textCaseToolbarActions,
  textCaseTooltipLabelKeys,
} from '../toolbarConfig'
import type {
  InlineToolbarAction,
  TextCaseToolbarAction,
} from '../toolbarConfig'
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
const TOOLBAR_EDGE_JUMP_TOLERANCE = 4
const TOOLBAR_BUTTON_WIDTH = 36
const TOOLBAR_BUTTON_GAP = 8
const TOOLBAR_DIVIDER_WIDTH = 1
const TOOLBAR_HEADING_WIDTH = 132
const TOOLBAR_LIST_WIDTH = 76
const TOOLBAR_EXTRA_TOOLS_TRANSITION_MS = 190
const TOOLBAR_OUTER_CHROME_WIDTH = 18
const TOOLBAR_EXPANDER_OUTER_WIDTH = 26

type ToolbarAction = InlineToolbarAction | TextCaseToolbarAction
type ToolbarLayoutItem = ToolbarAction | 'previewEdit'

const toolbarActions: ToolbarAction[] = [
  ...inlineToolbarActions,
  ...textCaseToolbarActions,
]
const toolbarActionsById = new Map<ToolbarAction['id'], ToolbarAction>(
  toolbarActions.map((action) => [action.id, action]),
)

const toolbarShortcutActionIds: Partial<
  Record<ToolbarAction['id'], ShortcutActionId>
> = {
  bold: shortcutActionIds.toolbarBold,
  code: shortcutActionIds.toolbarInlineCode,
  comment: shortcutActionIds.toolbarComment,
  highlight: shortcutActionIds.toolbarHighlight,
  image: shortcutActionIds.toolbarImage,
  italic: shortcutActionIds.toolbarItalic,
  link: shortcutActionIds.toolbarLink,
  lowercase: shortcutActionIds.editorLowercaseSelection,
  spoiler: shortcutActionIds.toolbarSpoiler,
  strikethrough: shortcutActionIds.toolbarStrikethrough,
  underline: shortcutActionIds.toolbarUnderline,
  uppercase: shortcutActionIds.editorUppercaseSelection,
}

const headingShortcutActionIds: Partial<Record<HeadingValue, ShortcutActionId>> =
  {
    h1: shortcutActionIds.toolbarHeading1,
    h2: shortcutActionIds.toolbarHeading2,
    h3: shortcutActionIds.toolbarHeading3,
    h4: shortcutActionIds.toolbarHeading4,
    h5: shortcutActionIds.toolbarHeading5,
    h6: shortcutActionIds.toolbarHeading6,
    normal: shortcutActionIds.toolbarNormalText,
  }

function isToolbarPopupTarget(target: EventTarget | null) {
  const element =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null

  return !!element?.closest('[data-toolbar-popup]')
}

function getToolbarItemsForPlacement(
  items: FloatingMarkdownToolbarItemCustomization[],
  placement: MenuItemPlacement,
) {
  const configuredItems: ToolbarAction[] = []

  for (const item of items) {
    if (
      item.placement !== placement ||
      item.id === 'heading' ||
      item.id === 'list'
    ) {
      continue
    }

    const action = toolbarActionsById.get(item.id)

    if (action) {
      configuredItems.push(action)
    }
  }

  return configuredItems
}

function isFixedToolbarItemEnabled(
  items: FloatingMarkdownToolbarItemCustomization[],
  id: 'heading' | 'list',
) {
  return items.find((item) => item.id === id)?.placement !== 'Disabled'
}

function getToolbarItemsWidth(items: ToolbarLayoutItem[]) {
  return items.length === 0
    ? 0
    : items.length * TOOLBAR_BUTTON_WIDTH +
        (items.length - 1) * TOOLBAR_BUTTON_GAP
}

function getExpandedExtraToolsOuterWidth(toolsWidth: number) {
  return toolsWidth > 0 ? toolsWidth + TOOLBAR_BUTTON_GAP : 0
}

function getToolbarSectionsWidth(
  middleWidth: number,
  showHeadingDropdown: boolean,
  showListDropdown: boolean,
) {
  const sectionWidths = [
    ...(showHeadingDropdown ? [TOOLBAR_HEADING_WIDTH] : []),
    ...(middleWidth > 0 ? [middleWidth] : []),
    ...(showListDropdown ? [TOOLBAR_LIST_WIDTH] : []),
  ]

  if (sectionWidths.length === 0) {
    return 0
  }

  return (
    sectionWidths.reduce((total, width) => total + width, 0) +
    (sectionWidths.length - 1) *
      (TOOLBAR_BUTTON_GAP * 2 + TOOLBAR_DIVIDER_WIDTH)
  )
}

function getCollapsedMiddleWidth(
  visibleItems: ToolbarLayoutItem[],
  hasOverflowTools: boolean,
) {
  return (
    getToolbarItemsWidth(visibleItems) +
    (hasOverflowTools ? TOOLBAR_EXPANDER_OUTER_WIDTH : 0)
  )
}

function getResponsiveToolbarItems(
  visibleItems: ToolbarAction[],
  overflowItems: ToolbarAction[],
  workspaceWidth: number,
  hasInternalOverflowItem: boolean,
  showHeadingDropdown: boolean,
  showListDropdown: boolean,
) {
  const availableToolbarContentWidth = Math.max(
    0,
    workspaceWidth -
      TOOLBAR_EDGE_PADDING * 2 -
      TOOLBAR_OUTER_CHROME_WIDTH,
  )
  let visibleItemCount = visibleItems.length

  while (visibleItemCount > 0) {
    const candidateVisibleItems = visibleItems.slice(0, visibleItemCount)
    const hasOverflowTools =
      visibleItemCount < visibleItems.length ||
      overflowItems.length > 0 ||
      hasInternalOverflowItem
    const candidateWidth = getToolbarSectionsWidth(
      getCollapsedMiddleWidth(candidateVisibleItems, hasOverflowTools),
      showHeadingDropdown,
      showListDropdown,
    )

    if (candidateWidth <= availableToolbarContentWidth) {
      break
    }

    visibleItemCount--
  }

  return {
    overflowItems: [
      ...visibleItems.slice(visibleItemCount),
      ...overflowItems,
    ],
    visibleItems: visibleItems.slice(0, visibleItemCount),
  }
}

function getClampedToolbarLeft(
  targetLeft: number,
  toolbarWidth: number,
  workspaceWidth: number,
) {
  return Math.round(
    clamp(
      targetLeft,
      TOOLBAR_EDGE_PADDING,
      workspaceWidth - toolbarWidth - TOOLBAR_EDGE_PADDING,
    ),
  )
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
  floatingMarkdownToolbarItems,
  onRequestEditorMode,
  previewContentRef,
  previewScrollElementRef,
  shortcutBindings,
  toolbarMode,
  viewMode,
  workspaceRef,
}: FloatingMarkdownToolbarProps) {
  const { t } = useTranslation()
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const toolbarToolsScrollRef = useRef<HTMLDivElement | null>(null)
  const toolbarBoundsFrameRef = useRef<number | null>(null)
  const toolbarPinReleaseTimeoutRef = useRef<number | null>(null)
  const toolbarProjectedWidthRef = useRef<number | null>(null)
  const toolbarProjectionTimeoutRef = useRef<number | null>(null)
  const [position, setPosition] = useState<ToolbarPosition | null>(null)
  const [extraToolsExpanded, setExtraToolsExpanded] = useState(false)
  const [extraToolsOverflowVisible, setExtraToolsOverflowVisible] =
    useState(false)
  const [workspaceWidth, setWorkspaceWidth] = useState(
    Number.POSITIVE_INFINITY,
  )
  const [toolbarPinnedRight, setToolbarPinnedRight] = useState<number | null>(
    null,
  )
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
    shortcutBindings,
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
            ...(toolbarPinnedRight !== null
              ? {
                  left: 'auto',
                  right: `${toolbarPinnedRight}px`,
                }
              : {
                  left: `${Math.round(position.left)}px`,
                }),
            top: `${Math.round(position.top)}px`,
          } satisfies CSSProperties)
        : undefined,
    [position, toolbarPinnedRight],
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
  const getShortcutLabel = useCallback(
    (actionId: ShortcutActionId) =>
      formatShortcutForDisplay(getShortcutBinding(shortcutBindings, actionId)),
    [shortcutBindings],
  )
  const getHeadingLabel = useCallback(
    (value: HeadingValue) => t(headingLabelKeys[value]),
    [t],
  )
  const getListLabel = useCallback(
    (value: ListValue) => t(listLabelKeys[value]),
    [t],
  )
  const headingMenuItems = useMemo(
    () =>
      headingItems.map((item) => {
        if (!('value' in item)) {
          return item
        }

        const actionId = headingShortcutActionIds[item.value as HeadingValue]

        return actionId
          ? {
              ...item,
              label: getHeadingLabel(item.value as HeadingValue),
              shortcut: getShortcutLabel(actionId),
            }
          : {
              ...item,
              label: getHeadingLabel(item.value as HeadingValue),
            }
      }),
    [getHeadingLabel, getShortcutLabel],
  )
  const listMenuItems = useMemo(
    () =>
      listItems.map((item) =>
        'value' in item
          ? {
              ...item,
              label: getListLabel(item.value as ListValue),
            }
          : item,
      ),
    [getListLabel],
  )
  const headingTooltip = useMemo(
    () => {
      const actionId = headingShortcutActionIds[headingValue]

      return {
        label: getHeadingLabel(headingValue),
        shortcut: actionId ? getShortcutLabel(actionId) : undefined,
      }
    },
    [getHeadingLabel, getShortcutLabel, headingValue],
  )
  const listTooltip = useMemo(
    () => ({
      label: getListLabel(listValue),
    }),
    [getListLabel, listValue],
  )
  const showHeadingDropdown = useMemo(
    () =>
      isFixedToolbarItemEnabled(
        floatingMarkdownToolbarItems,
        'heading',
      ),
    [floatingMarkdownToolbarItems],
  )
  const showListDropdown = useMemo(
    () =>
      isFixedToolbarItemEnabled(floatingMarkdownToolbarItems, 'list'),
    [floatingMarkdownToolbarItems],
  )
  const configuredVisibleToolbarItems = useMemo(
    () =>
      getToolbarItemsForPlacement(floatingMarkdownToolbarItems, 'Visible'),
    [floatingMarkdownToolbarItems],
  )
  const configuredOverflowToolbarItems = useMemo(
    () =>
      getToolbarItemsForPlacement(floatingMarkdownToolbarItems, 'Overflow'),
    [floatingMarkdownToolbarItems],
  )
  const responsiveToolbarItems = useMemo(
    () =>
      getResponsiveToolbarItems(
        configuredVisibleToolbarItems,
        configuredOverflowToolbarItems,
        workspaceWidth,
        previewEdit.available,
        showHeadingDropdown,
        showListDropdown,
      ),
    [
      configuredOverflowToolbarItems,
      configuredVisibleToolbarItems,
      previewEdit.available,
      showHeadingDropdown,
      showListDropdown,
      workspaceWidth,
    ],
  )
  const visibleToolbarItems = responsiveToolbarItems.visibleItems
  const overflowToolbarItems = responsiveToolbarItems.overflowItems
  const toolbarLayoutSignature = useMemo(
    () =>
      `${showHeadingDropdown ? 'heading' : ''}|${visibleToolbarItems
        .map((item) => item.id)
        .join(',')}|${overflowToolbarItems
        .map((item) => item.id)
        .join(',')}|${showListDropdown ? 'list' : ''}`,
    [
      overflowToolbarItems,
      showHeadingDropdown,
      showListDropdown,
      visibleToolbarItems,
    ],
  )
  const overflowLayoutItems = useMemo<ToolbarLayoutItem[]>(
    () =>
      previewEdit.available
        ? [...overflowToolbarItems, 'previewEdit']
        : overflowToolbarItems,
    [overflowToolbarItems, previewEdit.available],
  )
  const overflowToolsWidth = getToolbarItemsWidth(overflowLayoutItems)
  const hasOverflowTools = overflowLayoutItems.length > 0
  const promotedPreviewEdit = !extraToolsExpanded && previewEdit.open
  const visibleLayoutItems = useMemo<ToolbarLayoutItem[]>(
    () =>
      promotedPreviewEdit
        ? [...visibleToolbarItems, 'previewEdit']
        : visibleToolbarItems,
    [promotedPreviewEdit, visibleToolbarItems],
  )
  const renderedOverflowLayoutItems = promotedPreviewEdit
    ? overflowToolbarItems
    : overflowLayoutItems
  const hasMiddleTools =
    visibleLayoutItems.length > 0 || hasOverflowTools
  const extraToolsStyle = useMemo(
    () =>
      ({
        '--markdown-toolbar-extra-tools-width': `${overflowToolsWidth}px`,
      }) as ExtraToolsStyle,
    [overflowToolsWidth],
  )
  useEffect(() => {
    if (hasOverflowTools || !extraToolsExpanded) {
      return undefined
    }

    const frameId = window.requestAnimationFrame(() => {
      setExtraToolsExpanded(false)
      setExtraToolsOverflowVisible(false)
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [extraToolsExpanded, hasOverflowTools])
  useEffect(() => {
    if (!extraToolsExpanded) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setExtraToolsOverflowVisible(true)
    }, TOOLBAR_EXTRA_TOOLS_TRANSITION_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [extraToolsExpanded])
  useEffect(() => {
    const scrollElement = toolbarToolsScrollRef.current

    if (!scrollElement) {
      return undefined
    }

    if (!extraToolsExpanded) {
      scrollElement.scrollTo({ left: 0 })
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      scrollElement.scrollTo({
        behavior: 'smooth',
        left: scrollElement.scrollWidth,
      })
    }, TOOLBAR_EXTRA_TOOLS_TRANSITION_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [extraToolsExpanded, overflowToolsWidth])
  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setExtraToolsExpanded(false)
      setExtraToolsOverflowVisible(false)
      setToolbarPinnedRight(null)
      setOpenDropdown(null)
      clearToolbarTooltip()
      closePreviewEditMenu()
      closeLinkEditMenu()
      closeImageEditMenu()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [
    clearToolbarTooltip,
    closeImageEditMenu,
    closeLinkEditMenu,
    closePreviewEditMenu,
    setOpenDropdown,
    toolbarLayoutSignature,
  ])
  useEffect(() => {
    if (toolbarVisible) {
      return undefined
    }

    const frameId = window.requestAnimationFrame(() => {
      setExtraToolsExpanded(false)
      setExtraToolsOverflowVisible(false)
      setToolbarPinnedRight(null)
    })

    return () => {
      window.cancelAnimationFrame(frameId)
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
      const nextLeft = getClampedToolbarLeft(
        targetLeft,
        toolbarWidth,
        workspace.clientWidth,
      )

      if (nextLeft === Math.round(currentPosition.left)) {
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
    overflowToolsWidth,
    position?.preferredLeft,
    position?.top,
    promotedPreviewEdit,
    scheduleToolbarBoundsUpdate,
    toolbarVisible,
    visibleToolbarItems.length,
  ])
  useEffect(() => {
    const toolbar = toolbarRef.current
    const workspace = workspaceRef.current

    if (!toolbarVisible || !toolbar || !workspace) {
      return
    }

    const handleResize = () => {
      setWorkspaceWidth((currentWidth) =>
        currentWidth === workspace.clientWidth
          ? currentWidth
          : workspace.clientWidth,
      )
      scheduleToolbarBoundsUpdate()
    }
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(toolbar)
    resizeObserver.observe(workspace)
    handleResize()

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

      if (toolbarPinReleaseTimeoutRef.current !== null) {
        window.clearTimeout(toolbarPinReleaseTimeoutRef.current)
        toolbarPinReleaseTimeoutRef.current = null
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
    ({
      anchorRef,
      closeMenu,
      submenuId,
    }: ToolbarDropdownSubmenuRenderProps) => {
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

    if (!expanding) {
      setExtraToolsOverflowVisible(false)
    }

    closePreviewEditMenu()
    closeLinkEditMenu()
    closeImageEditMenu()
    setOpenDropdown(null)

    if (toolbar && workspace) {
      const currentWidth = toolbar.offsetWidth
      const maxToolbarWidth = Math.max(
        0,
        workspace.clientWidth - TOOLBAR_EDGE_PADDING * 2,
      )
      const collapsedToolbarWidth =
        getToolbarSectionsWidth(
          getCollapsedMiddleWidth(visibleLayoutItems, true),
          showHeadingDropdown,
          showListDropdown,
        ) +
        TOOLBAR_OUTER_CHROME_WIDTH
      const expandedToolbarWidth =
        getToolbarSectionsWidth(
          getToolbarItemsWidth(visibleLayoutItems) +
            getExpandedExtraToolsOuterWidth(overflowToolsWidth) +
            TOOLBAR_EXPANDER_OUTER_WIDTH,
          showHeadingDropdown,
          showListDropdown,
        ) +
        TOOLBAR_OUTER_CHROME_WIDTH
      const projectedWidth = Math.min(
        maxToolbarWidth,
        expanding ? expandedToolbarWidth : collapsedToolbarWidth,
      )
      const workspaceRect = workspace.getBoundingClientRect()
      const toolbarRect = toolbar.getBoundingClientRect()
      const currentRightGap = workspaceRect.right - toolbarRect.right
      const widthDelta = projectedWidth - currentWidth
      const isNearRightEdge =
        currentRightGap <= TOOLBAR_EDGE_PADDING + TOOLBAR_EDGE_JUMP_TOLERANCE
      const wouldOverflowRight =
        currentRightGap + TOOLBAR_EDGE_JUMP_TOLERANCE <
        widthDelta + TOOLBAR_EDGE_PADDING
      const shouldPinRightWhileExpanding =
        expanding &&
        widthDelta > 0 &&
        (isNearRightEdge || wouldOverflowRight)

      toolbarProjectedWidthRef.current = projectedWidth

      if (toolbarProjectionTimeoutRef.current !== null) {
        window.clearTimeout(toolbarProjectionTimeoutRef.current)
      }

      toolbarProjectionTimeoutRef.current = window.setTimeout(() => {
        toolbarProjectedWidthRef.current = null
        toolbarProjectionTimeoutRef.current = null
        scheduleToolbarBoundsUpdate()
      }, TOOLBAR_EXTRA_TOOLS_TRANSITION_MS + 40)

      if (toolbarPinReleaseTimeoutRef.current !== null) {
        window.clearTimeout(toolbarPinReleaseTimeoutRef.current)
        toolbarPinReleaseTimeoutRef.current = null
      }

      if (shouldPinRightWhileExpanding) {
        setToolbarPinnedRight(
          Math.max(TOOLBAR_EDGE_PADDING, Math.round(currentRightGap)),
        )
      } else if (!expanding && toolbarPinnedRight !== null) {
        toolbarPinReleaseTimeoutRef.current = window.setTimeout(() => {
          toolbarPinReleaseTimeoutRef.current = null
          setToolbarPinnedRight(null)
          scheduleToolbarBoundsUpdate()
        }, TOOLBAR_EXTRA_TOOLS_TRANSITION_MS + 40)
      } else if (expanding) {
        setToolbarPinnedRight(null)
      }

      setPosition((currentPosition) => {
        if (!currentPosition) {
          return currentPosition
        }

        const targetLeft = currentPosition.preferredLeft ?? currentPosition.left
        const nextLeft = getClampedToolbarLeft(
          targetLeft,
          projectedWidth,
          workspace.clientWidth,
        )

        if (nextLeft === Math.round(currentPosition.left)) {
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
    closeImageEditMenu,
    closeLinkEditMenu,
    closePreviewEditMenu,
    extraToolsExpanded,
    overflowToolsWidth,
    scheduleToolbarBoundsUpdate,
    setOpenDropdown,
    showHeadingDropdown,
    showListDropdown,
    toolbarPinnedRight,
    visibleLayoutItems,
    workspaceRef,
  ])
  const renderToolbarAction = (action: ToolbarAction) => {
    const active =
      'activeFormat' in action ? activeFormats[action.activeFormat] : false
    const command = action.command
    const actionId = toolbarShortcutActionIds[action.id]
    const shortcut = actionId ? getShortcutLabel(actionId) : undefined
    const tooltipLabel =
      'activeFormat' in action
        ? t(inlineTooltipLabelKeys[action.id])
        : t(textCaseTooltipLabelKeys[action.id])
    const localizedTooltip = {
      ...action.tooltip,
      label: tooltipLabel,
    }
    const tooltip = shortcut
      ? {
          ...localizedTooltip,
          shortcut,
        }
      : localizedTooltip

    if (command.type === 'textCase') {
      return (
        <ToolbarButton
          key={action.id}
          ariaLabel={tooltipLabel}
          active={false}
          onTooltipHide={hideToolbarTooltip}
          onTooltipShow={showToolbarTooltip}
          onClick={() =>
            runEditorCommand((activeEditor) => {
              transformSelectedTextCase(activeEditor, command.textCase)
            })
          }
          tooltip={tooltip}
        >
          <ToolbarIcon name={action.icon} />
        </ToolbarButton>
      )
    }

    if (command.type === 'link') {
      return linkEdit.available ? (
        <LinkEditMenu
          key={action.id}
          active={active}
          initialState={linkEdit.initialState}
          open={linkEdit.open}
          shortcutBindings={shortcutBindings}
          toolbarRef={toolbarRef}
          triggerShortcut={shortcut}
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
          ariaLabel={tooltipLabel}
          active={active}
          onTooltipHide={hideToolbarTooltip}
          onTooltipShow={showToolbarTooltip}
          onClick={() => runEditorCommand(toggleLinkSelection)}
          tooltip={tooltip}
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
          shortcutBindings={shortcutBindings}
          toolbarRef={toolbarRef}
          triggerShortcut={shortcut}
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
          ariaLabel={tooltipLabel}
          active={active}
          onTooltipHide={hideToolbarTooltip}
          onTooltipShow={showToolbarTooltip}
          onClick={() => runEditorCommand(toggleImageSelection)}
          tooltip={tooltip}
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
        ariaLabel={tooltipLabel}
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
        tooltip={tooltip}
      >
        <ToolbarIcon name={action.icon} />
      </ToolbarButton>
    )
  }
  const renderPreviewEditMenu = () =>
    previewEdit.available ? (
      <PreviewEditMenu
        key="previewEdit"
        open={previewEdit.open}
        shortcutBindings={shortcutBindings}
        sourceText={previewEdit.sourceText}
        toolbarRef={toolbarRef}
        triggerShortcut={getShortcutLabel(
          shortcutActionIds.toolbarEditPreviewSelection,
        )}
        workspaceRef={workspaceRef}
        onCancel={previewEdit.cancel}
        onClose={previewEdit.close}
        onConfirm={previewEdit.confirm}
        onOpen={previewEdit.openMenu}
        onTooltipHide={hideToolbarTooltip}
        onTooltipShow={showToolbarTooltip}
      />
    ) : null

  const renderHeadingDropdown = () => (
    <ToolbarDropdown
      className="heading-dropdown"
      ariaLabel={t('toolbar.selectTextStyle')}
      menuLabel={t('toolbar.textStyles')}
      items={headingMenuItems}
      open={openDropdown === 'heading'}
      onOpenChange={handleHeadingOpenChange}
      onTooltipHide={hideToolbarTooltip}
      onTooltipShow={showToolbarTooltip}
      selectedValue={headingValue}
      triggerTooltip={headingTooltip}
      triggerLabel={getHeadingLabel(headingValue)}
      onSelect={handleHeadingSelect}
      renderSubmenu={renderHeadingSubmenu}
    />
  )

  const renderListDropdown = () => (
    <ToolbarDropdown
      align="right"
      className="list-dropdown"
      ariaLabel={t('toolbar.listStyle', { label: getListLabel(listValue) })}
      menuLabel={t('toolbar.listStyles')}
      items={listMenuItems}
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
  )

  const renderToolbarLayoutItems = (items: ToolbarLayoutItem[]) =>
    items.map((item) =>
      item === 'previewEdit'
        ? renderPreviewEditMenu()
        : renderToolbarAction(item),
    )

  if (
    !editor ||
    !position ||
    (!showHeadingDropdown && !showListDropdown && !hasMiddleTools)
  ) {
    return null
  }

  return (
    <div
      ref={toolbarRef}
      className="floating-markdown-toolbar"
      style={toolbarStyle}
      role="toolbar"
      aria-label={t('toolbar.markdownFormatting')}
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
      {showHeadingDropdown ? (
        <div className="markdown-toolbar-fixed-section">
          {renderHeadingDropdown()}
        </div>
      ) : null}
      {showHeadingDropdown && (hasMiddleTools || showListDropdown) ? (
        <div className="markdown-toolbar-divider" aria-hidden="true" />
      ) : null}
      {hasMiddleTools ? (
        <div className="markdown-toolbar-format-tools">
          <div
            ref={toolbarToolsScrollRef}
            className="markdown-toolbar-tools-scroll"
          >
            <div className="markdown-toolbar-primary-tools">
              {renderToolbarLayoutItems(visibleLayoutItems)}
            </div>
            <div
              className={`markdown-toolbar-extra-tools${
                extraToolsExpanded ? ' is-expanded' : ''
              }${
                extraToolsOverflowVisible ? ' allows-overflow' : ''
              }`}
              aria-hidden={!extraToolsExpanded}
              style={extraToolsStyle}
            >
              <div className="markdown-toolbar-extra-tools-inner">
                {renderToolbarLayoutItems(renderedOverflowLayoutItems)}
              </div>
            </div>
          </div>
          {hasOverflowTools ? (
            <ToolbarButton
              active={false}
              ariaExpanded={extraToolsExpanded}
              ariaLabel={
                extraToolsExpanded
                  ? t('toolbar.hideExtraTools')
                  : t('toolbar.moreTools')
              }
              className="markdown-toolbar-expand-button"
              onTooltipHide={hideToolbarTooltip}
              onTooltipShow={showToolbarTooltip}
              onClick={handleExtraToolsToggle}
              tooltip={{
                label: extraToolsExpanded
                  ? t('toolbar.hideExtraTools')
                  : t('toolbar.moreTools'),
              }}
            >
              <MoreToolsChevron expanded={extraToolsExpanded} />
            </ToolbarButton>
          ) : null}
        </div>
      ) : null}
      {hasMiddleTools && showListDropdown ? (
        <div className="markdown-toolbar-divider" aria-hidden="true" />
      ) : null}
      {showListDropdown ? (
        <div className="markdown-toolbar-fixed-section">
          {renderListDropdown()}
        </div>
      ) : null}
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
