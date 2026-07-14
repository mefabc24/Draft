import {
  configurableShortcutActionIds,
  defaultShortcutBindings,
  fixedMouseGestureShortcutActionIds,
  shortcutActionIds,
  type ShortcutActionId,
  type ShortcutBindings,
} from './shortcutSettings'
import {
  eventMatchesDefaultShortcutAction,
  eventMatchesShortcutAction,
} from './shortcutMatching'

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

type BrowserShortcutCommandAction = {
  actionId: ShortcutActionId
  command: BrowserShortcutDraftCommand
  id: string
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
  getShortcutBindings?: () => ShortcutBindings
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
]

export const draftHandledBrowserShortcuts: readonly BrowserShortcutCommandAction[] = [
  {
    actionId: shortcutActionIds.appSave,
    command: 'save',
    id: 'draft.save',
  },
  {
    actionId: shortcutActionIds.appOpen,
    command: 'open',
    id: 'draft.open',
  },
]

export const draftCommandShortcutActions: readonly ShortcutActionId[] = [
  shortcutActionIds.editorUndo,
  shortcutActionIds.editorRedo,
  shortcutActionIds.editorDuplicateLine,
  shortcutActionIds.editorToggleLineCapitalization,
  shortcutActionIds.editorUppercaseSelection,
  shortcutActionIds.editorLowercaseSelection,
  shortcutActionIds.editorMoveLineUp,
  shortcutActionIds.editorMoveLineDown,
  shortcutActionIds.editorMoveCursorWordLeft,
  shortcutActionIds.editorMoveCursorWordRight,
  shortcutActionIds.editorExtendSelectionWordLeft,
  shortcutActionIds.editorExtendSelectionWordRight,
  shortcutActionIds.editorContinueMarkdownBlock,
  shortcutActionIds.editorIndentListItem,
  shortcutActionIds.toolbarBold,
  shortcutActionIds.toolbarItalic,
  shortcutActionIds.toolbarUnderline,
  shortcutActionIds.toolbarInlineCode,
  shortcutActionIds.toolbarSpoiler,
  shortcutActionIds.toolbarHighlight,
  shortcutActionIds.toolbarComment,
  shortcutActionIds.toolbarStrikethrough,
  shortcutActionIds.toolbarLink,
  shortcutActionIds.toolbarImage,
  shortcutActionIds.toolbarNormalText,
  shortcutActionIds.toolbarHeading1,
  shortcutActionIds.toolbarHeading2,
  shortcutActionIds.toolbarHeading3,
  shortcutActionIds.toolbarHeading4,
  shortcutActionIds.toolbarHeading5,
  shortcutActionIds.toolbarHeading6,
  shortcutActionIds.toolbarEditPreviewSelection,
  shortcutActionIds.toolbarConfirmEdit,
  shortcutActionIds.toolbarClose,
  shortcutActionIds.quickInsertOpenMenu,
]

const unguardedDefaultDraftActions: readonly ShortcutActionId[] = [
  shortcutActionIds.editorContinueMarkdownBlock,
  shortcutActionIds.editorIndentListItem,
  shortcutActionIds.toolbarConfirmEdit,
  shortcutActionIds.toolbarClose,
]

const globallyBlockedChangedDefaultActions = configurableShortcutActionIds.filter(
  (actionId) =>
    actionId !== shortcutActionIds.editorContinueMarkdownBlock &&
    actionId !== shortcutActionIds.editorIndentListItem &&
    actionId !== shortcutActionIds.toolbarConfirmEdit &&
    actionId !== shortcutActionIds.toolbarClose &&
    !fixedMouseGestureShortcutActionIds.includes(actionId),
)

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
  shortcutBindings: ShortcutBindings = defaultShortcutBindings,
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
    eventMatchesShortcutAction(event, shortcutBindings, rule.actionId),
  )

  if (draftHandledShortcut) {
    return {
      command: draftHandledShortcut.command,
      kind: 'handleDraftCommand',
      shortcutId: draftHandledShortcut.id,
    }
  }

  const draftCommandShortcut = draftCommandShortcutActions.find((actionId) => {
    if (!eventMatchesShortcutAction(event, shortcutBindings, actionId)) {
      return false
    }

    return (
      !unguardedDefaultDraftActions.includes(actionId) ||
      !eventMatchesDefaultShortcutAction(event, actionId)
    )
  })

  if (draftCommandShortcut) {
    return {
      kind: 'passToDraftCommand',
      shortcutId: draftCommandShortcut,
    }
  }

  const changedDefaultShortcut = globallyBlockedChangedDefaultActions.find((
    actionId,
  ) =>
    eventMatchesDefaultShortcutAction(event, actionId) &&
    !eventMatchesShortcutAction(event, shortcutBindings, actionId),
  )

  if (changedDefaultShortcut) {
    return {
      kind: 'blockBrowserDefault',
      shortcutId: `default.${changedDefaultShortcut}`,
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
    options.getShortcutBindings?.() ?? defaultShortcutBindings,
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
