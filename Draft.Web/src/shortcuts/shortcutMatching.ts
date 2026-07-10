import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import {
  defaultShortcutBindings,
  getShortcutBinding,
  type ShortcutActionId,
  type ShortcutBindings,
} from './shortcutSettings'

type ParsedShortcut = {
  altKey: boolean
  key: string
  primaryKey: boolean
  shiftKey: boolean
}

const keyAliases: Record<string, string> = {
  arrowdown: 'down',
  arrowleft: 'left',
  arrowright: 'right',
  arrowup: 'up',
  control: 'ctrl',
  del: 'delete',
  escape: 'esc',
  return: 'enter',
}

const codeKeys: Record<string, string> = {
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  Backspace: 'backspace',
  Delete: 'delete',
  End: 'end',
  Enter: 'enter',
  Escape: 'esc',
  Home: 'home',
  Insert: 'insert',
  Minus: '-',
  NumpadAdd: 'num +',
  NumpadDecimal: 'num .',
  NumpadDivide: 'num /',
  NumpadMultiply: 'num *',
  NumpadSubtract: 'num -',
  PageDown: 'page down',
  PageUp: 'page up',
  Period: '.',
  Slash: '/',
  Space: 'space',
  Tab: 'tab',
}

const monacoKeyCodes: Record<string, monaco.KeyCode> = {
  '/': monaco.KeyCode.Slash,
  '+': monaco.KeyCode.Equal,
  '-': monaco.KeyCode.Minus,
  '0': monaco.KeyCode.Digit0,
  '1': monaco.KeyCode.Digit1,
  '2': monaco.KeyCode.Digit2,
  '3': monaco.KeyCode.Digit3,
  '4': monaco.KeyCode.Digit4,
  '5': monaco.KeyCode.Digit5,
  '6': monaco.KeyCode.Digit6,
  '7': monaco.KeyCode.Digit7,
  '8': monaco.KeyCode.Digit8,
  '9': monaco.KeyCode.Digit9,
  a: monaco.KeyCode.KeyA,
  b: monaco.KeyCode.KeyB,
  c: monaco.KeyCode.KeyC,
  d: monaco.KeyCode.KeyD,
  down: monaco.KeyCode.DownArrow,
  e: monaco.KeyCode.KeyE,
  enter: monaco.KeyCode.Enter,
  esc: monaco.KeyCode.Escape,
  f: monaco.KeyCode.KeyF,
  g: monaco.KeyCode.KeyG,
  h: monaco.KeyCode.KeyH,
  i: monaco.KeyCode.KeyI,
  j: monaco.KeyCode.KeyJ,
  k: monaco.KeyCode.KeyK,
  l: monaco.KeyCode.KeyL,
  left: monaco.KeyCode.LeftArrow,
  m: monaco.KeyCode.KeyM,
  n: monaco.KeyCode.KeyN,
  'num *': monaco.KeyCode.NumpadMultiply,
  'num +': monaco.KeyCode.NumpadAdd,
  'num -': monaco.KeyCode.NumpadSubtract,
  'num .': monaco.KeyCode.NumpadDecimal,
  'num /': monaco.KeyCode.NumpadDivide,
  'num 0': monaco.KeyCode.Numpad0,
  'num 1': monaco.KeyCode.Numpad1,
  'num 2': monaco.KeyCode.Numpad2,
  'num 3': monaco.KeyCode.Numpad3,
  'num 4': monaco.KeyCode.Numpad4,
  'num 5': monaco.KeyCode.Numpad5,
  'num 6': monaco.KeyCode.Numpad6,
  'num 7': monaco.KeyCode.Numpad7,
  'num 8': monaco.KeyCode.Numpad8,
  'num 9': monaco.KeyCode.Numpad9,
  o: monaco.KeyCode.KeyO,
  p: monaco.KeyCode.KeyP,
  q: monaco.KeyCode.KeyQ,
  r: monaco.KeyCode.KeyR,
  right: monaco.KeyCode.RightArrow,
  s: monaco.KeyCode.KeyS,
  space: monaco.KeyCode.Space,
  t: monaco.KeyCode.KeyT,
  tab: monaco.KeyCode.Tab,
  u: monaco.KeyCode.KeyU,
  up: monaco.KeyCode.UpArrow,
  v: monaco.KeyCode.KeyV,
  w: monaco.KeyCode.KeyW,
  x: monaco.KeyCode.KeyX,
  y: monaco.KeyCode.KeyY,
  z: monaco.KeyCode.KeyZ,
}

function splitShortcutParts(shortcut: string) {
  const trimmedShortcut = shortcut.trim()

  if (trimmedShortcut.includes(' + ')) {
    return trimmedShortcut
      .split(' + ')
      .map((part) => part.trim())
      .filter(Boolean)
  }

  return trimmedShortcut
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
}

function normalizeKeyName(value: string) {
  const normalized = value.trim().toLowerCase()

  if (/^num\s+[0-9]$/u.test(normalized)) {
    return normalized
  }

  if (normalized === 'num +') {
    return normalized
  }

  if (normalized === 'num -') {
    return normalized
  }

  if (normalized === 'num /') {
    return normalized
  }

  if (normalized === 'num *' || normalized === 'num .') {
    return normalized
  }

  if (/^digit[0-9]$/u.test(normalized)) {
    return normalized.replace('digit', '')
  }

  if (/^key[a-z]$/u.test(normalized)) {
    return normalized.replace('key', '')
  }

  return keyAliases[normalized] ?? normalized
}

export function parseShortcut(shortcut: string): ParsedShortcut | null {
  const parts = shortcut
    ? splitShortcutParts(shortcut)
    : []
  let key = ''
  let primaryKey = false
  let shiftKey = false
  let altKey = false

  for (const part of parts) {
    const normalized = normalizeKeyName(part)

    if (normalized === 'ctrl' || normalized === 'cmd' || normalized === 'command') {
      primaryKey = true
      continue
    }

    if (normalized === 'shift') {
      shiftKey = true
      continue
    }

    if (normalized === 'alt' || normalized === 'option') {
      altKey = true
      continue
    }

    if (key.length > 0) {
      return null
    }

    key = normalized
  }

  if (key.length === 0) {
    return null
  }

  return {
    altKey,
    key,
    primaryKey,
    shiftKey,
  }
}

function getEventKey(event: KeyboardEvent) {
  if (event.code in codeKeys) {
    return codeKeys[event.code]
  }

  if (/^Digit[0-9]$/u.test(event.code)) {
    return event.code.replace('Digit', '')
  }

  if (/^Numpad[0-9]$/u.test(event.code)) {
    return event.code.replace('Numpad', 'num ')
  }

  if (/^Key[A-Z]$/u.test(event.code)) {
    return event.code.replace('Key', '').toLowerCase()
  }

  if (/^F([1-9]|1[0-9]|2[0-4])$/u.test(event.code)) {
    return event.code.toLowerCase()
  }

  return normalizeKeyName(event.key)
}

export function eventMatchesShortcut(
  event: KeyboardEvent,
  shortcut: string,
) {
  const parsed = parseShortcut(shortcut)

  if (!parsed) {
    return false
  }

  const eventHasPrimaryKey = event.ctrlKey || event.metaKey

  return (
    eventHasPrimaryKey === parsed.primaryKey &&
    event.shiftKey === parsed.shiftKey &&
    event.altKey === parsed.altKey &&
    getEventKey(event) === parsed.key
  )
}

export function eventMatchesShortcutAction(
  event: KeyboardEvent,
  bindings: ShortcutBindings,
  actionId: ShortcutActionId,
) {
  return eventMatchesShortcut(event, getShortcutBinding(bindings, actionId))
}

export function eventMatchesAnyShortcutAction(
  event: KeyboardEvent,
  bindings: ShortcutBindings,
  actionIds: readonly ShortcutActionId[],
) {
  return actionIds.some((actionId) =>
    eventMatchesShortcutAction(event, bindings, actionId),
  )
}

export function eventMatchesDefaultShortcutAction(
  event: KeyboardEvent,
  actionId: ShortcutActionId,
) {
  return eventMatchesShortcut(event, defaultShortcutBindings[actionId] ?? '')
}

export function getMonacoKeybinding(shortcut: string) {
  const parsed = parseShortcut(shortcut)

  if (!parsed) {
    return null
  }

  const keyCode = monacoKeyCodes[parsed.key]

  if (keyCode === undefined) {
    return null
  }

  let keybinding = keyCode as number

  if (parsed.primaryKey) {
    keybinding |= monaco.KeyMod.CtrlCmd
  }

  if (parsed.shiftKey) {
    keybinding |= monaco.KeyMod.Shift
  }

  if (parsed.altKey) {
    keybinding |= monaco.KeyMod.Alt
  }

  return keybinding
}

export function getMonacoShortcutKeybinding(
  bindings: ShortcutBindings,
  actionId: ShortcutActionId,
) {
  return getMonacoKeybinding(getShortcutBinding(bindings, actionId))
}
