import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { clamp } from '../../shared/utils/clamp'
import { isEditorQuickInsertTargetLine } from '../commands/editorQuickInsertCommands'

const BUTTON_SIZE = 24
const MENU_EDGE_PADDING = 8
const MENU_GAP = 8
const MENU_ESTIMATED_WIDTH = 294
const MENU_ESTIMATED_HEIGHT = 324

export type EditorQuickInsertMenuAnchor = {
  left: number
  lineNumber: number
}

export type EditorQuickInsertMenuPosition = {
  left: number
  top: number
}

type EditorQuickInsertMenuTarget = EditorQuickInsertMenuAnchor

function getQuickInsertMenuPosition(
  editor: monaco.editor.IStandaloneCodeEditor,
  editorBody: HTMLDivElement,
  menu: HTMLDivElement | null,
  target: EditorQuickInsertMenuTarget,
): EditorQuickInsertMenuPosition | null {
  if (!isEditorQuickInsertTargetLine(editor, target.lineNumber)) {
    return null
  }

  const visiblePosition = editor.getScrolledVisiblePosition({
    column: 1,
    lineNumber: target.lineNumber,
  })

  if (!visiblePosition) {
    return null
  }

  const menuWidth = menu?.offsetWidth ?? MENU_ESTIMATED_WIDTH
  const menuHeight = menu?.offsetHeight ?? MENU_ESTIMATED_HEIGHT
  const maxLeft = editorBody.clientWidth - menuWidth - MENU_EDGE_PADDING
  const maxTop = editorBody.clientHeight - menuHeight - MENU_EDGE_PADDING
  const preferredLeft = target.left + BUTTON_SIZE + MENU_GAP
  const preferredTop = visiblePosition.top - MENU_GAP

  return {
    left: clamp(preferredLeft, MENU_EDGE_PADDING, maxLeft),
    top: clamp(preferredTop, MENU_EDGE_PADDING, maxTop),
  }
}

export function useEditorQuickInsertMenu(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  editorBodyRef: RefObject<HTMLDivElement | null>,
) {
  const [menuTarget, setMenuTarget] =
    useState<EditorQuickInsertMenuTarget | null>(null)
  const [menuPosition, setMenuPosition] =
    useState<EditorQuickInsertMenuPosition | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const menuTargetRef = useRef<EditorQuickInsertMenuTarget | null>(null)
  const updateFrameRef = useRef<number | null>(null)

  const closeMenu = useCallback(() => {
    menuTargetRef.current = null
    setMenuTarget(null)
    setMenuPosition(null)
  }, [])

  const updateMenuPosition = useCallback(() => {
    const target = menuTargetRef.current
    const editorBody = editorBodyRef.current

    if (!editor || !editorBody || !target) {
      closeMenu()
      return
    }

    const nextPosition = getQuickInsertMenuPosition(
      editor,
      editorBody,
      menuRef.current,
      target,
    )

    if (!nextPosition) {
      closeMenu()
      return
    }

    setMenuPosition(nextPosition)
  }, [closeMenu, editor, editorBodyRef])

  const scheduleMenuPositionUpdate = useCallback(() => {
    if (updateFrameRef.current !== null) {
      window.cancelAnimationFrame(updateFrameRef.current)
    }

    updateFrameRef.current = window.requestAnimationFrame(() => {
      updateFrameRef.current = null
      updateMenuPosition()
    })
  }, [updateMenuPosition])

  const openMenu = useCallback(
    (anchor: EditorQuickInsertMenuAnchor) => {
      const editorBody = editorBodyRef.current

      if (!editor || !editorBody) {
        return
      }

      const nextPosition = getQuickInsertMenuPosition(
        editor,
        editorBody,
        null,
        anchor,
      )

      if (!nextPosition) {
        closeMenu()
        return
      }

      menuTargetRef.current = anchor
      setMenuTarget(anchor)
      setMenuPosition(nextPosition)
      scheduleMenuPositionUpdate()
    },
    [closeMenu, editor, editorBodyRef, scheduleMenuPositionUpdate],
  )

  useLayoutEffect(() => {
    if (!menuTarget) {
      return
    }

    updateMenuPosition()
  }, [menuTarget, updateMenuPosition])

  useEffect(() => {
    if (!editor || !menuTarget) {
      return
    }

    const handleContentChange = () => {
      if (!isEditorQuickInsertTargetLine(editor, menuTarget.lineNumber)) {
        closeMenu()
        return
      }

      scheduleMenuPositionUpdate()
    }

    const scrollDisposable = editor.onDidScrollChange(scheduleMenuPositionUpdate)
    const layoutDisposable = editor.onDidLayoutChange(scheduleMenuPositionUpdate)
    const configurationDisposable = editor.onDidChangeConfiguration(
      scheduleMenuPositionUpdate,
    )
    const contentDisposable = editor.onDidChangeModelContent(handleContentChange)
    const modelDisposable = editor.onDidChangeModel(closeMenu)

    window.addEventListener('resize', scheduleMenuPositionUpdate)

    return () => {
      scrollDisposable.dispose()
      layoutDisposable.dispose()
      configurationDisposable.dispose()
      contentDisposable.dispose()
      modelDisposable.dispose()
      window.removeEventListener('resize', scheduleMenuPositionUpdate)
    }
  }, [
    closeMenu,
    editor,
    menuTarget,
    scheduleMenuPositionUpdate,
  ])

  useEffect(() => {
    if (editor) {
      return
    }

    const closeFrame = window.requestAnimationFrame(closeMenu)

    return () => {
      window.cancelAnimationFrame(closeFrame)
    }
  }, [closeMenu, editor])

  useEffect(() => {
    return () => {
      if (updateFrameRef.current !== null) {
        window.cancelAnimationFrame(updateFrameRef.current)
        updateFrameRef.current = null
      }
    }
  }, [])

  return {
    closeMenu,
    menuPosition,
    menuRef,
    openMenu,
    targetLineNumber: menuTarget?.lineNumber ?? null,
  }
}
