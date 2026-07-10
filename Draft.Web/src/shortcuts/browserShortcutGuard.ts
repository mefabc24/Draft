export type BrowserShortcutPolicyKind =
  | 'allow'
  | 'blockBrowserDefault'
  | 'handleDraftCommand'
  | 'passToDraftCommand'

export type BrowserShortcutDraftCommand = 'open' | 'save'

type BrowserShortcut = {
  altKey: boolean
  code: string
  ctrlKey: boolean
  key: string
  metaKey: boolean
  shiftKey: boolean
}

type BrowserShortcutRule = {
  id: string
  match: (shortcut: BrowserShortcut) => boolean
}

type BrowserShortcutCommandRule = BrowserShortcutRule & {
  command: BrowserShortcutDraftCommand
}

type BrowserShortcutDevelopmentRule = BrowserShortcutRule & {
  allowInDevelopment?: boolean
}

export type BrowserShortcutPolicy =
  | {
      kind: 'allow'
      shortcutId?: string
    }
  | {
      kind: 'blockBrowserDefault'
      shortcutId: string
    }
  | {
      command: BrowserShortcutDraftCommand
      kind: 'handleDraftCommand'
      shortcutId: string
    }
  | {
      kind: 'passToDraftCommand'
      shortcutId: string
    }

export type BrowserShortcutGuardOptions = {
  allowDeveloperShortcuts?: boolean
  onDraftCommand: (command: BrowserShortcutDraftCommand) => void
}

const shortcutKeys: Record<string, readonly string[]> = {
  a: ['KeyA'],
  b: ['KeyB'],
  c: ['KeyC'],
  d: ['KeyD'],
  e: ['KeyE'],
  f: ['KeyF'],
  h: ['KeyH'],
  i: ['KeyI'],
  k: ['KeyK'],
  l: ['KeyL'],
  n: ['KeyN'],
  o: ['KeyO'],
  p: ['KeyP'],
  r: ['KeyR'],
  s: ['KeyS'],
  t: ['KeyT'],
  u: ['KeyU'],
  v: ['KeyV'],
  w: ['KeyW'],
  x: ['KeyX'],
  y: ['KeyY'],
  z: ['KeyZ'],
} as const

function toShortcut(event: KeyboardEvent): BrowserShortcut {
  return {
    altKey: event.altKey,
    code: event.code,
    ctrlKey: event.ctrlKey,
    key: event.key.toLowerCase(),
    metaKey: event.metaKey,
    shiftKey: event.shiftKey,
  }
}

function hasPrimaryModifier(shortcut: BrowserShortcut) {
  return shortcut.ctrlKey || shortcut.metaKey
}

function hasOnlyPrimaryModifier(shortcut: BrowserShortcut) {
  return hasPrimaryModifier(shortcut) && !shortcut.altKey && !shortcut.shiftKey
}

function hasPrimaryAndShift(shortcut: BrowserShortcut) {
  return hasPrimaryModifier(shortcut) && !shortcut.altKey && shortcut.shiftKey
}

function hasPrimaryAndAlt(shortcut: BrowserShortcut) {
  return hasPrimaryModifier(shortcut) && shortcut.altKey && !shortcut.shiftKey
}

function hasAltOnly(shortcut: BrowserShortcut) {
  return shortcut.altKey && !shortcut.ctrlKey && !shortcut.metaKey && !shortcut.shiftKey
}

function isKey(shortcut: BrowserShortcut, key: string) {
  return shortcut.key === key || shortcutKeys[key]?.includes(shortcut.code) === true
}

function isCode(shortcut: BrowserShortcut, ...codes: string[]) {
  return codes.includes(shortcut.code)
}

function primaryKey(key: string) {
  return (shortcut: BrowserShortcut) =>
    hasOnlyPrimaryModifier(shortcut) && isKey(shortcut, key)
}

function primaryShiftKey(key: string) {
  return (shortcut: BrowserShortcut) =>
    hasPrimaryAndShift(shortcut) && isKey(shortcut, key)
}

function primaryAltKey(key: string) {
  return (shortcut: BrowserShortcut) =>
    hasPrimaryAndAlt(shortcut) && isKey(shortcut, key)
}

function primaryDigit(digit: number) {
  const key = `${digit}`
  const codes = [`Digit${digit}`, `Numpad${digit}`]

  return (shortcut: BrowserShortcut) =>
    hasOnlyPrimaryModifier(shortcut) &&
    (shortcut.key === key || isCode(shortcut, ...codes))
}

function primaryPlus(shortcut: BrowserShortcut) {
  return (
    hasPrimaryModifier(shortcut) &&
    !shortcut.altKey &&
    (shortcut.key === '+' || shortcut.key === '=' || isCode(shortcut, 'Equal', 'NumpadAdd'))
  )
}

function primaryMinus(shortcut: BrowserShortcut) {
  return (
    hasPrimaryModifier(shortcut) &&
    !shortcut.altKey &&
    (shortcut.key === '-' || isCode(shortcut, 'Minus', 'NumpadSubtract'))
  )
}

function fKey(key: 'F5' | 'F12') {
  return (shortcut: BrowserShortcut) =>
    shortcut.key === key.toLowerCase() || shortcut.code === key
}

function altArrow(code: 'ArrowLeft' | 'ArrowRight') {
  return (shortcut: BrowserShortcut) =>
    hasAltOnly(shortcut) && (shortcut.key === code.toLowerCase() || shortcut.code === code)
}

export const allowedBrowserShortcuts: readonly BrowserShortcutRule[] = [
  { id: 'text.selectAll', match: primaryKey('a') },
  { id: 'text.copy', match: primaryKey('c') },
  { id: 'text.cut', match: primaryKey('x') },
  { id: 'text.paste', match: primaryKey('v') },
  { id: 'text.undo', match: primaryKey('z') },
  { id: 'text.redo.ctrlY', match: primaryKey('y') },
  { id: 'text.redo.shiftZ', match: primaryShiftKey('z') },
]

export const draftHandledBrowserShortcuts: readonly BrowserShortcutCommandRule[] = [
  { command: 'save', id: 'draft.save', match: primaryKey('s') },
  { command: 'open', id: 'draft.open', match: primaryKey('o') },
]

export const draftCommandShortcuts: readonly BrowserShortcutRule[] = [
  { id: 'draft.toolbar.bold', match: primaryKey('b') },
  { id: 'draft.toolbar.italic', match: primaryKey('i') },
  { id: 'draft.toolbar.underline', match: primaryKey('u') },
  { id: 'draft.toolbar.inlineCode', match: primaryKey('e') },
  { id: 'draft.toolbar.spoiler', match: primaryShiftKey('s') },
  { id: 'draft.toolbar.highlight', match: primaryShiftKey('h') },
  {
    id: 'draft.toolbar.comment',
    match: (shortcut) =>
      hasOnlyPrimaryModifier(shortcut) &&
      (shortcut.key === '/' || isCode(shortcut, 'Slash')),
  },
  { id: 'draft.toolbar.strikethrough', match: primaryShiftKey('x') },
  { id: 'draft.toolbar.link', match: primaryKey('k') },
  { id: 'draft.toolbar.image', match: primaryAltKey('i') },
  { id: 'draft.toolbar.heading1', match: primaryDigit(1) },
  { id: 'draft.toolbar.heading2', match: primaryDigit(2) },
  { id: 'draft.toolbar.heading3', match: primaryDigit(3) },
  { id: 'draft.toolbar.heading4', match: primaryDigit(4) },
  { id: 'draft.toolbar.heading5', match: primaryDigit(5) },
  { id: 'draft.toolbar.heading6', match: primaryDigit(6) },
  { id: 'draft.toolbar.normalText', match: primaryKey('n') },
  { id: 'draft.editor.duplicateLine', match: primaryKey('d') },
  {
    id: 'draft.editor.quickInsert',
    match: (shortcut) =>
      hasOnlyPrimaryModifier(shortcut) &&
      (shortcut.key === ' ' || isCode(shortcut, 'Space')),
  },
  { id: 'draft.preview.edit', match: primaryShiftKey('e') },
]

export const blockedBrowserShortcuts: readonly BrowserShortcutDevelopmentRule[] = [
  { id: 'browser.print', match: primaryKey('p') },
  { id: 'browser.find', match: primaryKey('f') },
  {
    id: 'browser.reload',
    match: (shortcut) =>
      hasPrimaryModifier(shortcut) && !shortcut.altKey && isKey(shortcut, 'r'),
  },
  { id: 'browser.reloadF5', match: fKey('F5') },
  { id: 'browser.zoomIn', match: primaryPlus },
  { id: 'browser.zoomOut', match: primaryMinus },
  { id: 'browser.zoomReset', match: primaryDigit(0) },
  { id: 'browser.addressBar', match: primaryKey('l') },
  { id: 'browser.back', match: altArrow('ArrowLeft') },
  { id: 'browser.forward', match: altArrow('ArrowRight') },
  { id: 'browser.closeTab', match: primaryKey('w') },
  { id: 'browser.newTab', match: primaryKey('t') },
  { id: 'browser.reopenClosedTab', match: primaryShiftKey('t') },
  {
    allowInDevelopment: true,
    id: 'browser.devToolsF12',
    match: fKey('F12'),
  },
  {
    allowInDevelopment: true,
    id: 'browser.devTools',
    match: primaryShiftKey('i'),
  },
]

export function getBrowserShortcutPolicy(
  event: KeyboardEvent,
  allowDeveloperShortcuts = false,
): BrowserShortcutPolicy {
  const shortcut = toShortcut(event)
  const allowedShortcut = allowedBrowserShortcuts.find((rule) =>
    rule.match(shortcut),
  )

  if (allowedShortcut) {
    return {
      kind: 'allow',
      shortcutId: allowedShortcut.id,
    }
  }

  const draftHandledShortcut = draftHandledBrowserShortcuts.find((rule) =>
    rule.match(shortcut),
  )

  if (draftHandledShortcut) {
    return {
      command: draftHandledShortcut.command,
      kind: 'handleDraftCommand',
      shortcutId: draftHandledShortcut.id,
    }
  }

  const draftCommandShortcut = draftCommandShortcuts.find((rule) =>
    rule.match(shortcut),
  )

  if (draftCommandShortcut) {
    return {
      kind: 'passToDraftCommand',
      shortcutId: draftCommandShortcut.id,
    }
  }

  const blockedShortcut = blockedBrowserShortcuts.find((rule) => {
    if (rule.allowInDevelopment && allowDeveloperShortcuts) {
      return false
    }

    return rule.match(shortcut)
  })

  if (blockedShortcut) {
    return {
      kind: 'blockBrowserDefault',
      shortcutId: blockedShortcut.id,
    }
  }

  return { kind: 'allow' }
}

function consumeShortcut(event: KeyboardEvent) {
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
}

export function handleBrowserShortcutKeyDown(
  event: KeyboardEvent,
  options: BrowserShortcutGuardOptions,
) {
  if (event.defaultPrevented) {
    return
  }

  const policy = getBrowserShortcutPolicy(
    event,
    options.allowDeveloperShortcuts ?? false,
  )

  switch (policy.kind) {
    case 'allow':
      return
    case 'blockBrowserDefault':
      consumeShortcut(event)
      return
    case 'handleDraftCommand':
      consumeShortcut(event)
      options.onDraftCommand(policy.command)
      return
    case 'passToDraftCommand':
      event.preventDefault()
      return
  }
}

export function addBrowserShortcutGuard(options: BrowserShortcutGuardOptions) {
  const handleKeyDown = (event: KeyboardEvent) => {
    handleBrowserShortcutKeyDown(event, options)
  }

  document.addEventListener('keydown', handleKeyDown, true)

  return () => {
    document.removeEventListener('keydown', handleKeyDown, true)
  }
}
