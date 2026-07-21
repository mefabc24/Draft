import {
  useMemo,
  type CSSProperties,
  type RefObject,
} from 'react'
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { useTranslation } from '../../localization/useTranslation'
import type { QuickInsertItemCustomization } from '../../settings/menuCustomization'
import type { ShortcutBindings } from '../../shortcuts/shortcutSettings'
import { useEditorQuickInsertMenu } from '../hooks/useEditorQuickInsertMenu'
import { useHoveredEditorLine } from '../hooks/useHoveredEditorLine'
import EditorQuickInsertMenu from './EditorQuickInsertMenu'
import { hasAvailableEditorQuickInsertEntries } from './EditorQuickInsertMenuConfig'

type EmptyLineInsertButtonProps = {
  editor: monaco.editor.IStandaloneCodeEditor | null
  editorBodyRef: RefObject<HTMLDivElement | null>
  quickInsertItems: QuickInsertItemCustomization[]
  shortcutBindings: ShortcutBindings
}

function EmptyLineInsertButton({
  editor,
  editorBodyRef,
  quickInsertItems,
  shortcutBindings,
}: EmptyLineInsertButtonProps) {
  const { t } = useTranslation()
  const {
    clearPendingHide,
    hoveredLine,
    scheduleHideHoveredLine,
    updatePointerPoint,
  } = useHoveredEditorLine(editor)
  const {
    closeMenu,
    menuInstanceKey,
    menuPosition,
    menuRef,
    openMenu,
    runMenuActionKeepingOpen,
    target,
    updateMenuBounds,
  } = useEditorQuickInsertMenu(
    editor,
    editorBodyRef,
    quickInsertItems,
    shortcutBindings,
  )
  const buttonStyle = useMemo(
    () =>
      hoveredLine
        ? ({
            left: `${hoveredLine.left}px`,
            top: `${hoveredLine.top}px`,
          }) satisfies CSSProperties
        : undefined,
    [hoveredLine],
  )
  const canShowButton = hoveredLine
    ? hasAvailableEditorQuickInsertEntries(
        quickInsertItems,
        hoveredLine.mode,
      )
    : false

  if (!editor) {
    return null
  }

  return (
    <>
      {hoveredLine && canShowButton ? (
        <button
          aria-label={t(
            'quickInsert.openEditorQuickInsertMenu',
            'Open Editor Quick Insert Menu',
          )}
          className="empty-line-insert-button"
          onClick={() => {
            openMenu({
              anchor: hoveredLine.anchor,
              column: hoveredLine.column,
              lineNumber: hoveredLine.lineNumber,
              mode: hoveredLine.mode,
            })
          }}
          onMouseDown={(event) => {
            event.preventDefault()
          }}
          onPointerDown={(event) => {
            event.preventDefault()
          }}
          onPointerEnter={(event) => {
            updatePointerPoint(event.clientX, event.clientY)
            clearPendingHide()
          }}
          onPointerLeave={(event) => {
            scheduleHideHoveredLine({
              clientX: event.clientX,
              clientY: event.clientY,
            })
          }}
          onPointerMove={(event) => {
            updatePointerPoint(event.clientX, event.clientY)
            clearPendingHide()
          }}
          style={buttonStyle}
          tabIndex={-1}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="empty-line-insert-icon"
            focusable="false"
            viewBox="0 0 16 16"
          >
            <path d="M8 3.25v9.5M3.25 8h9.5" />
          </svg>
        </button>
      ) : null}
      <EditorQuickInsertMenu
        editor={editor}
        key={target === null ? 'closed' : `open:${menuInstanceKey}`}
        menuRef={menuRef}
        onClose={closeMenu}
        onContentLayoutChange={updateMenuBounds}
        onKeepOpenAction={runMenuActionKeepingOpen}
        position={menuPosition}
        quickInsertItems={quickInsertItems}
        shortcutBindings={shortcutBindings}
        target={target}
      />
    </>
  )
}

export default EmptyLineInsertButton
