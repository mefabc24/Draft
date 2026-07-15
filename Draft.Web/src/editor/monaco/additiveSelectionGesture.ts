import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { eventMatchesShortcutKeyboardState } from '../../shortcuts/shortcutMatching'
import {
  defaultShortcutBindings,
  getShortcutBinding,
  shortcutActionIds,
} from '../../shortcuts/shortcutSettings'
import { cloneSelections, isEmptySelection } from './markdownSelection'

const LEFT_MOUSE_BUTTON = 0
const LEFT_MOUSE_BUTTON_MASK = 1
const DEFAULT_KEYBOARD_SHORTCUT = getShortcutBinding(
  defaultShortcutBindings,
  shortcutActionIds.editorAddSelectionRange,
)
const NO_PRESSED_KEYS = new Set<string>()

type AdditiveSelectionGesture = {
  anchorPosition: monaco.Position
  baseSelections: monaco.Selection[]
  currentSelection: monaco.Selection | null
}

export function isAdditiveSelectionMouseGesture(
  event: MouseEvent,
  keyboardShortcut = DEFAULT_KEYBOARD_SHORTCUT,
  pressedKeys: ReadonlySet<string> = NO_PRESSED_KEYS,
) {
  return (
    event.button === LEFT_MOUSE_BUTTON &&
    eventMatchesShortcutKeyboardState(event, keyboardShortcut, pressedKeys)
  )
}

function isAdditiveSelectionMouseMove(
  event: MouseEvent,
  keyboardShortcut: string,
  pressedKeys: ReadonlySet<string>,
) {
  return (
    (event.buttons & LEFT_MOUSE_BUTTON_MASK) === LEFT_MOUSE_BUTTON_MASK &&
    eventMatchesShortcutKeyboardState(event, keyboardShortcut, pressedKeys)
  )
}

function consumeMouseEvent(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
}

function getMousePosition(
  editor: monaco.editor.IStandaloneCodeEditor,
  event: MouseEvent,
) {
  return editor.getTargetAtClientPoint(event.clientX, event.clientY)?.position ?? null
}

function createSelectionFromPositions(
  anchorPosition: monaco.Position,
  activePosition: monaco.Position,
) {
  return new monaco.Selection(
    anchorPosition.lineNumber,
    anchorPosition.column,
    activePosition.lineNumber,
    activePosition.column,
  )
}

function getNormalizedSelectionKey(selection: monaco.Selection) {
  const startPosition = selection.getStartPosition()
  const endPosition = selection.getEndPosition()

  return `${startPosition.lineNumber}:${startPosition.column}:${endPosition.lineNumber}:${endPosition.column}`
}

function mergeSelectionList(
  baseSelections: monaco.Selection[],
  addedSelection: monaco.Selection | null,
) {
  const selections =
    addedSelection && !isEmptySelection(addedSelection)
      ? [...baseSelections, addedSelection]
      : baseSelections
  const seenSelections = new Set<string>()

  return selections.filter((selection) => {
    const selectionKey = getNormalizedSelectionKey(selection)

    if (seenSelections.has(selectionKey)) {
      return false
    }

    seenSelections.add(selectionKey)
    return true
  })
}

function getBaseSelections(editor: monaco.editor.IStandaloneCodeEditor) {
  const selections = cloneSelections(editor.getSelections() ?? [])

  if (selections.length === 1 && isEmptySelection(selections[0])) {
    return []
  }

  return selections
}

function setAdditiveSelections(
  editor: monaco.editor.IStandaloneCodeEditor,
  gesture: AdditiveSelectionGesture,
  addedSelection: monaco.Selection | null,
) {
  const selections = mergeSelectionList(gesture.baseSelections, addedSelection)

  if (selections.length > 0) {
    editor.setSelections(selections)
  }
}

function addWordSelectionAtPosition(
  editor: monaco.editor.IStandaloneCodeEditor,
  position: monaco.Position,
) {
  const model = editor.getModel()

  if (!model) {
    return
  }

  const word = model.getWordAtPosition(position)

  if (!word) {
    return
  }

  const baseSelections = getBaseSelections(editor)
  const wordSelection = new monaco.Selection(
    position.lineNumber,
    word.startColumn,
    position.lineNumber,
    word.endColumn,
  )

  editor.setSelections(mergeSelectionList(baseSelections, wordSelection))
  editor.focus()
}

export function registerAdditiveSelectionGesture(
  editor: monaco.editor.IStandaloneCodeEditor,
  getKeyboardShortcut: () => string = () => DEFAULT_KEYBOARD_SHORTCUT,
  pressedKeys: ReadonlySet<string> = NO_PRESSED_KEYS,
): monaco.IDisposable {
  const editorNode = editor.getDomNode()

  if (!editorNode) {
    return { dispose: () => {} }
  }

  let activeGesture: AdditiveSelectionGesture | null = null

  const finishGesture = (options: { focusEditor: boolean } = { focusEditor: true }) => {
    const gesture = activeGesture

    if (!gesture) {
      return
    }

    setAdditiveSelections(editor, gesture, gesture.currentSelection)
    activeGesture = null

    if (options.focusEditor) {
      editor.focus()
    }
  }

  const handleMouseDown = (event: MouseEvent) => {
    if (!isAdditiveSelectionMouseGesture(
      event,
      getKeyboardShortcut(),
      pressedKeys,
    )) {
      return
    }

    const position = getMousePosition(editor, event)

    if (!position) {
      return
    }

    consumeMouseEvent(event)
    activeGesture = {
      anchorPosition: position,
      baseSelections: getBaseSelections(editor),
      currentSelection: null,
    }
    setAdditiveSelections(editor, activeGesture, null)
    editor.focus()
  }

  const handleMouseMove = (event: MouseEvent) => {
    const gesture = activeGesture

    if (!gesture) {
      return
    }

    consumeMouseEvent(event)

    if (!isAdditiveSelectionMouseMove(
      event,
      getKeyboardShortcut(),
      pressedKeys,
    )) {
      finishGesture()
      return
    }

    const position = getMousePosition(editor, event)

    if (!position) {
      return
    }

    gesture.currentSelection = createSelectionFromPositions(
      gesture.anchorPosition,
      position,
    )
    setAdditiveSelections(editor, gesture, gesture.currentSelection)
  }

  const handleMouseUp = (event: MouseEvent) => {
    if (!activeGesture) {
      return
    }

    consumeMouseEvent(event)
    finishGesture()
  }

  const handleDoubleClick = (event: MouseEvent) => {
    if (!isAdditiveSelectionMouseGesture(
      event,
      getKeyboardShortcut(),
      pressedKeys,
    )) {
      return
    }

    const position = getMousePosition(editor, event)

    if (!position) {
      return
    }

    consumeMouseEvent(event)
    activeGesture = null
    addWordSelectionAtPosition(editor, position)
  }

  const handleWindowBlur = () => {
    finishGesture({ focusEditor: false })
  }

  editorNode.addEventListener('mousedown', handleMouseDown, true)
  editorNode.addEventListener('dblclick', handleDoubleClick, true)
  window.addEventListener('mousemove', handleMouseMove, true)
  window.addEventListener('mouseup', handleMouseUp, true)
  window.addEventListener('blur', handleWindowBlur)

  return {
    dispose: () => {
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('mouseup', handleMouseUp, true)
      window.removeEventListener('mousemove', handleMouseMove, true)
      editorNode.removeEventListener('dblclick', handleDoubleClick, true)
      editorNode.removeEventListener('mousedown', handleMouseDown, true)
      activeGesture = null
    },
  }
}
