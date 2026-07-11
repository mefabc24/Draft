import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import {
  getMonacoShortcutKeybinding,
} from '../../shortcuts/shortcutMatching'
import {
  shortcutActionIds,
  type ShortcutBindings,
} from '../../shortcuts/shortcutSettings'
import { useTranslation } from '../../localization/useTranslation'
import { clamp } from '../../shared/utils/clamp'
import {
  getEditorQuickInsertTargetFromPosition,
  isEditorQuickInsertTarget,
  type EditorQuickInsertTarget,
} from '../commands/editorQuickInsertCommands'
import {
  EDITOR_EMPTY_LINE_INSERT_BUTTON_LEFT,
  EDITOR_QUICK_INSERT_CURSOR_BUTTON_GAP,
} from '../monaco/editorOptions'

const BUTTON_SIZE = 24
const MENU_EDGE_PADDING = 8
const MENU_GAP = 8
const MENU_ESTIMATED_WIDTH = 294
const MENU_ESTIMATED_HEIGHT = 324
const MENU_LIST_SELECTOR = '.editor-quick-insert-menu-list'
const MENU_SCROLL_SELECTOR = '.editor-quick-insert-menu-scroll'

export type EditorQuickInsertMenuAnchor = EditorQuickInsertTarget & {
  anchor: 'cursor' | 'gutter'
}

export type EditorQuickInsertMenuPosition = {
  left: number
  maxHeight: number
  top: number
}

type EditorQuickInsertMenuTarget = EditorQuickInsertMenuAnchor
type EditorQuickInsertMenuPreferredPosition = Omit<
  EditorQuickInsertMenuPosition,
  'maxHeight'
>

function getQuickInsertMenuPreferredPosition(
  editor: monaco.editor.IStandaloneCodeEditor,
  target: EditorQuickInsertMenuTarget,
): EditorQuickInsertMenuPreferredPosition | null {
  if (!isEditorQuickInsertTarget(editor, target)) {
    return null
  }

  const visiblePosition = editor.getScrolledVisiblePosition({
    column: target.anchor === 'gutter' ? 1 : target.column,
    lineNumber: target.lineNumber,
  })

  if (!visiblePosition) {
    return null
  }

  const buttonLeft =
    target.anchor === 'gutter'
      ? EDITOR_EMPTY_LINE_INSERT_BUTTON_LEFT
      : visiblePosition.left + EDITOR_QUICK_INSERT_CURSOR_BUTTON_GAP

  return {
    left: buttonLeft + BUTTON_SIZE + MENU_GAP,
    top: visiblePosition.top - MENU_GAP,
  }
}

function getQuickInsertMenuNaturalHeight(menu: HTMLDivElement | null) {
  if (!menu) {
    return MENU_ESTIMATED_HEIGHT
  }

  const scrollElement =
    menu.querySelector<HTMLDivElement>(MENU_SCROLL_SELECTOR)

  if (!scrollElement) {
    return menu.offsetHeight
  }

  const menuChromeHeight = Math.max(
    menu.offsetHeight - scrollElement.clientHeight,
    0,
  )

  return Math.max(
    menu.offsetHeight,
    scrollElement.scrollHeight + menuChromeHeight,
  )
}

function clampQuickInsertMenuPosition(
  editorBody: HTMLDivElement,
  menu: HTMLDivElement | null,
  position: EditorQuickInsertMenuPreferredPosition,
) {
  const menuWidth = menu?.offsetWidth ?? MENU_ESTIMATED_WIDTH
  const menuHeight = getQuickInsertMenuNaturalHeight(menu)
  const maxLeft = editorBody.clientWidth - menuWidth - MENU_EDGE_PADDING
  const maxTop = editorBody.clientHeight - menuHeight - MENU_EDGE_PADDING

  const top = clamp(position.top, MENU_EDGE_PADDING, maxTop)

  return {
    left: clamp(position.left, MENU_EDGE_PADDING, maxLeft),
    maxHeight: Math.max(editorBody.clientHeight - top - MENU_EDGE_PADDING, 0),
    top,
  }
}

export function useEditorQuickInsertMenu(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  editorBodyRef: RefObject<HTMLDivElement | null>,
  shortcutBindings: ShortcutBindings,
) {
  const { t } = useTranslation()
  const [menuTarget, setMenuTarget] =
    useState<EditorQuickInsertMenuTarget | null>(null)
  const [menuPosition, setMenuPosition] =
    useState<EditorQuickInsertMenuPosition | null>(null)
  const [menuInstanceKey, setMenuInstanceKey] = useState(0)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const menuPreferredPositionRef =
    useRef<EditorQuickInsertMenuPreferredPosition | null>(null)
  const menuTargetRef = useRef<EditorQuickInsertMenuTarget | null>(null)
  const keepOpenActionRef = useRef(false)
  const lockMenuPositionRef = useRef(false)
  const boundsUpdateFrameRef = useRef<number | null>(null)
  const updateFrameRef = useRef<number | null>(null)

  const closeMenu = useCallback(() => {
    menuPreferredPositionRef.current = null
    menuTargetRef.current = null
    lockMenuPositionRef.current = false
    setMenuTarget(null)
    setMenuPosition(null)
  }, [])

  const updateMenuPosition = useCallback(() => {
    if (lockMenuPositionRef.current) {
      return
    }

    const target = menuTargetRef.current
    const editorBody = editorBodyRef.current

    if (!editor || !editorBody || !target) {
      closeMenu()
      return
    }

    const preferredPosition = getQuickInsertMenuPreferredPosition(editor, target)

    if (!preferredPosition) {
      closeMenu()
      return
    }

    const nextPosition = clampQuickInsertMenuPosition(
      editorBody,
      menuRef.current,
      preferredPosition,
    )

    menuPreferredPositionRef.current = preferredPosition
    setMenuPosition(nextPosition)
  }, [closeMenu, editor, editorBodyRef])

  const scheduleMenuPositionUpdate = useCallback(() => {
    if (lockMenuPositionRef.current) {
      return
    }

    if (updateFrameRef.current !== null) {
      window.cancelAnimationFrame(updateFrameRef.current)
    }

    updateFrameRef.current = window.requestAnimationFrame(() => {
      updateFrameRef.current = null
      updateMenuPosition()
    })
  }, [updateMenuPosition])

  const clampMenuPositionToViewport = useCallback(() => {
    const editorBody = editorBodyRef.current
    const menu = menuRef.current

    if (!editorBody || !menu) {
      return
    }

    setMenuPosition((currentPosition) => {
      if (!currentPosition) {
        return currentPosition
      }

      const targetPosition =
        menuPreferredPositionRef.current ?? currentPosition
      const nextPosition = clampQuickInsertMenuPosition(
        editorBody,
        menu,
        targetPosition,
      )

      if (
        nextPosition.left === currentPosition.left &&
        nextPosition.maxHeight === currentPosition.maxHeight &&
        nextPosition.top === currentPosition.top
      ) {
        return currentPosition
      }

      return nextPosition
    })
  }, [editorBodyRef])

  const scheduleMenuBoundsUpdate = useCallback(() => {
    if (boundsUpdateFrameRef.current !== null) {
      window.cancelAnimationFrame(boundsUpdateFrameRef.current)
    }

    boundsUpdateFrameRef.current = window.requestAnimationFrame(() => {
      boundsUpdateFrameRef.current = null
      clampMenuPositionToViewport()
    })
  }, [clampMenuPositionToViewport])

  const openMenu = useCallback(
    (anchor: EditorQuickInsertMenuAnchor) => {
      const editorBody = editorBodyRef.current

      if (!editor || !editorBody) {
        return
      }

      const preferredPosition = getQuickInsertMenuPreferredPosition(
        editor,
        anchor,
      )

      if (!preferredPosition) {
        closeMenu()
        return
      }

      const nextPosition = clampQuickInsertMenuPosition(
        editorBody,
        null,
        preferredPosition,
      )

      menuPreferredPositionRef.current = preferredPosition
      menuTargetRef.current = anchor
      lockMenuPositionRef.current = false
      setMenuInstanceKey((currentKey) => currentKey + 1)
      setMenuTarget(anchor)
      setMenuPosition(nextPosition)
      scheduleMenuPositionUpdate()
    },
    [closeMenu, editor, editorBodyRef, scheduleMenuPositionUpdate],
  )

  const openMenuAtCursor = useCallback(() => {
    if (!editor) {
      return
    }

    const target = getEditorQuickInsertTargetFromPosition(
      editor,
      editor.getPosition(),
    )

    if (!target) {
      closeMenu()
      return
    }

    openMenu({
      ...target,
      anchor: 'cursor',
    })
  }, [closeMenu, editor, openMenu])

  const moveMenuToLine = useCallback(
    (lineNumber: number) => {
      const currentTarget = menuTargetRef.current

      if (!editor || !currentTarget) {
        closeMenu()
        return
      }

      const nextTarget = {
        ...currentTarget,
        column: 1,
        lineNumber,
        mode: 'replace-line' as const,
      }

      if (!isEditorQuickInsertTarget(editor, nextTarget)) {
        closeMenu()
        return
      }

      menuTargetRef.current = nextTarget
      lockMenuPositionRef.current = true
      setMenuTarget(nextTarget)
    },
    [closeMenu, editor],
  )

  const runMenuActionKeepingOpen = useCallback(
    (action: () => number | false | null) => {
      keepOpenActionRef.current = true

      try {
        const nextLineNumber = action()

        if (typeof nextLineNumber === 'number') {
          moveMenuToLine(nextLineNumber)
        } else {
          closeMenu()
        }
      } finally {
        keepOpenActionRef.current = false
      }
    },
    [closeMenu, moveMenuToLine],
  )

  useLayoutEffect(() => {
    if (!menuTarget) {
      return
    }

    updateMenuPosition()
  }, [menuTarget, updateMenuPosition])

  useEffect(() => {
    if (!menuTarget) {
      return
    }

    const menu = menuRef.current
    const editorBody = editorBodyRef.current

    if (!menu) {
      return
    }

    const resizeObserver = new ResizeObserver(scheduleMenuBoundsUpdate)
    const menuList = menu.querySelector<HTMLDivElement>(MENU_LIST_SELECTOR)

    resizeObserver.observe(menu)

    if (menuList) {
      resizeObserver.observe(menuList)
    }

    if (editorBody) {
      resizeObserver.observe(editorBody)
    }

    scheduleMenuBoundsUpdate()

    return () => {
      resizeObserver.disconnect()
    }
  }, [editorBodyRef, menuTarget, scheduleMenuBoundsUpdate])

  useEffect(() => {
    if (!editor) {
      return
    }

    const action = editor.addAction({
      id: 'draft.editorQuickInsert.openMenu',
      label: t('commands.quickInsert.openMenu'),
      keybindings: (() => {
        const keybinding = getMonacoShortcutKeybinding(
          shortcutBindings,
          shortcutActionIds.quickInsertOpenMenu,
        )

        return keybinding === null ? [] : [keybinding]
      })(),
      run: () => {
        openMenuAtCursor()
      },
    })

    return () => {
      action.dispose()
    }
  }, [editor, openMenuAtCursor, shortcutBindings, t])

  useEffect(() => {
    if (!editor || !menuTarget) {
      return
    }

    const handleContentChange = () => {
      const currentTarget = menuTargetRef.current

      if (!currentTarget) {
        closeMenu()
        return
      }

      if (keepOpenActionRef.current) {
        return
      }

      if (!isEditorQuickInsertTarget(editor, currentTarget)) {
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
      if (boundsUpdateFrameRef.current !== null) {
        window.cancelAnimationFrame(boundsUpdateFrameRef.current)
        boundsUpdateFrameRef.current = null
      }

      if (updateFrameRef.current !== null) {
        window.cancelAnimationFrame(updateFrameRef.current)
        updateFrameRef.current = null
      }
    }
  }, [])

  return {
    closeMenu,
    menuInstanceKey,
    menuPosition,
    menuRef,
    openMenu,
    openMenuAtCursor,
    runMenuActionKeepingOpen,
    target: menuTarget,
    updateMenuBounds: clampMenuPositionToViewport,
  }
}
