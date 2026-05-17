import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import {
  applyHeadingStyle,
  applyListStyle,
  toggleWrappedSelection,
} from '../../editor/monaco/markdownCommandAdapter'
import type { HeadingValue, ListValue } from '../../markdown'
import { useFloatingToolbarState } from '../hooks/useFloatingToolbarState'
import { useToolbarTooltip } from '../hooks/useToolbarTooltip'
import {
  headingItems,
  headingLabels,
  headingShortcuts,
  inlineTooltips,
  listIcons,
  listItems,
  listLabels,
} from '../toolbarConfig'
import type {
  FloatingMarkdownToolbarProps,
  ToolbarPosition,
} from '../toolbarTypes'
import LinkEditMenu from './LinkEditMenu'
import PreviewEditMenu from './PreviewEditMenu'
import ToolbarButton from './ToolbarButton'
import ToolbarDropdown from './ToolbarDropdown'
import ToolbarIcon from './ToolbarIcon'
import ToolbarTooltip from './ToolbarTooltip'
import '../styles/floatingMarkdownToolbar.css'

function isToolbarPopupTarget(target: EventTarget | null) {
  const element =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null

  return !!element?.closest('[data-toolbar-popup]')
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
  const [position, setPosition] = useState<ToolbarPosition | null>(null)
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
    headingValue,
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
  const toolbarStyle = useMemo(
    () =>
      position
        ? ({
            left: `${position.left}px`,
            top: `${position.top}px`,
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
      setOpenDropdown(open ? 'heading' : null)
    },
    [closeLinkEditMenu, closePreviewEditMenu, hideToolbarTooltip, setOpenDropdown],
  )
  const handleListOpenChange = useCallback(
    (open: boolean) => {
      hideToolbarTooltip()
      closePreviewEditMenu()
      closeLinkEditMenu()
      setOpenDropdown(open ? 'list' : null)
    },
    [closeLinkEditMenu, closePreviewEditMenu, hideToolbarTooltip, setOpenDropdown],
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
  const handleListSelect = useCallback(
    (value: string) => {
      runEditorCommand((activeEditor, commandOptions) => {
        applyListStyle(activeEditor, value as ListValue, commandOptions)
      })
    },
    [runEditorCommand],
  )

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
      />

      <div className="markdown-toolbar-divider" aria-hidden="true" />

      <ToolbarButton
        ariaLabel="Bold"
        active={activeFormats.bold}
        onTooltipHide={hideToolbarTooltip}
        onTooltipShow={showToolbarTooltip}
        onClick={() => runEditorCommand((activeEditor, commandOptions) => {
          toggleWrappedSelection(activeEditor, '**', '**', commandOptions)
        })}
        tooltip={inlineTooltips.bold}
      >
        <ToolbarIcon name="bold" />
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="Italic"
        active={activeFormats.italic}
        onTooltipHide={hideToolbarTooltip}
        onTooltipShow={showToolbarTooltip}
        onClick={() => runEditorCommand((activeEditor, commandOptions) => {
          toggleWrappedSelection(activeEditor, '*', '*', commandOptions)
        })}
        tooltip={inlineTooltips.italic}
      >
        <ToolbarIcon name="italic" />
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="Strikethrough"
        active={activeFormats.strikethrough}
        onTooltipHide={hideToolbarTooltip}
        onTooltipShow={showToolbarTooltip}
        onClick={() => runEditorCommand((activeEditor, commandOptions) => {
          toggleWrappedSelection(activeEditor, '~~', '~~', commandOptions)
        })}
        tooltip={inlineTooltips.strikethrough}
      >
        <ToolbarIcon name="strikethrough" />
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="Inline code"
        active={activeFormats.code}
        onTooltipHide={hideToolbarTooltip}
        onTooltipShow={showToolbarTooltip}
        onClick={() => runEditorCommand((activeEditor, commandOptions) => {
          toggleWrappedSelection(activeEditor, '`', '`', commandOptions)
        })}
        tooltip={inlineTooltips.code}
      >
        <ToolbarIcon name="code" />
      </ToolbarButton>
      <LinkEditMenu
        active={activeFormats.link}
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
      {previewEdit.available ? (
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
      ) : null}

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
