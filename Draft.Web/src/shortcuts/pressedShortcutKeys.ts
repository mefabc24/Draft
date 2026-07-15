import {
  getShortcutEventKey,
  isShortcutModifierKeyName,
} from './shortcutMatching'

export type PressedShortcutKeyTracker = {
  dispose: () => void
  pressedKeys: ReadonlySet<string>
}

export function registerPressedShortcutKeyTracker(
  target: Document = document,
): PressedShortcutKeyTracker {
  const pressedKeys = new Set<string>()
  const targetWindow = target.defaultView

  const handleKeyDown = (event: KeyboardEvent) => {
    const key = getShortcutEventKey(event)

    if (!isShortcutModifierKeyName(key)) {
      pressedKeys.add(key)
    }
  }
  const handleKeyUp = (event: KeyboardEvent) => {
    pressedKeys.delete(getShortcutEventKey(event))
  }
  const resetPressedKeys = () => {
    pressedKeys.clear()
  }

  target.addEventListener('keydown', handleKeyDown, true)
  target.addEventListener('keyup', handleKeyUp, true)
  targetWindow?.addEventListener('blur', resetPressedKeys)

  return {
    dispose: () => {
      targetWindow?.removeEventListener('blur', resetPressedKeys)
      target.removeEventListener('keyup', handleKeyUp, true)
      target.removeEventListener('keydown', handleKeyDown, true)
      pressedKeys.clear()
    },
    pressedKeys,
  }
}
