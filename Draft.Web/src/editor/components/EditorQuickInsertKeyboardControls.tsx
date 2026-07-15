import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { useTranslation } from '../../localization/useTranslation'
import type { CreateKeyboardMarkdownData } from '../commands/createKeyboardMarkdown'

type EditorQuickInsertKeyboardControlsProps = {
  onConfirm: (data: CreateKeyboardMarkdownData, keepOpen?: boolean) => void
  shouldKeepOpen: (event: ReactMouseEvent<HTMLButtonElement>) => boolean
}

const modifierKeyOrder = ['CTRL', 'SHIFT', 'ALT', 'WIN'] as const

function getKeyLabel(key: string) {
  if (key === ' ') {
    return 'SPACE'
  }

  if (key.length === 1) {
    return key.toUpperCase()
  }

  switch (key) {
    case 'Control':
      return 'CTRL'
    case 'Shift':
      return 'SHIFT'
    case 'Alt':
      return 'ALT'
    case 'Meta':
      return 'WIN'
    case 'Escape':
      return 'ESC'
    case 'ArrowLeft':
      return 'LEFT'
    case 'ArrowRight':
      return 'RIGHT'
    case 'ArrowUp':
      return 'UP'
    case 'ArrowDown':
      return 'DOWN'
    case 'PageUp':
      return 'PAGE UP'
    case 'PageDown':
      return 'PAGE DOWN'
    case 'CapsLock':
      return 'CAPS LOCK'
    case 'Backspace':
      return 'BACKSPACE'
    case 'Delete':
      return 'DELETE'
    case 'Insert':
      return 'INSERT'
    case 'Enter':
      return 'ENTER'
    case 'Tab':
      return 'TAB'
    case 'Home':
      return 'HOME'
    case 'End':
      return 'END'
    case 'ContextMenu':
      return 'MENU'
    case 'Dead':
    case 'Process':
    case 'Unidentified':
      return null
    default:
      return key.toUpperCase()
  }
}

function isModifierKey(key: string) {
  return modifierKeyOrder.includes(
    key as (typeof modifierKeyOrder)[number],
  )
}

function addPressedKey(
  pressedKeys: Set<string>,
  pressedKeyOrder: string[],
  key: string,
) {
  if (pressedKeys.has(key)) {
    return
  }

  pressedKeys.add(key)
  pressedKeyOrder.push(key)
}

function addCurrentModifierKeys(
  event: KeyboardEvent,
  pressedKeys: Set<string>,
  pressedKeyOrder: string[],
) {
  if (event.ctrlKey) {
    addPressedKey(pressedKeys, pressedKeyOrder, 'CTRL')
  }
  if (event.shiftKey) {
    addPressedKey(pressedKeys, pressedKeyOrder, 'SHIFT')
  }
  if (event.altKey) {
    addPressedKey(pressedKeys, pressedKeyOrder, 'ALT')
  }
  if (event.metaKey) {
    addPressedKey(pressedKeys, pressedKeyOrder, 'WIN')
  }
}

function removePressedKey(
  pressedKeys: Set<string>,
  pressedKeyOrder: string[],
  key: string,
) {
  pressedKeys.delete(key)

  const keyIndex = pressedKeyOrder.indexOf(key)
  if (keyIndex >= 0) {
    pressedKeyOrder.splice(keyIndex, 1)
  }
}

function removeReleasedModifierKeys(
  event: KeyboardEvent,
  pressedKeys: Set<string>,
  pressedKeyOrder: string[],
) {
  if (!event.ctrlKey) {
    removePressedKey(pressedKeys, pressedKeyOrder, 'CTRL')
  }
  if (!event.shiftKey) {
    removePressedKey(pressedKeys, pressedKeyOrder, 'SHIFT')
  }
  if (!event.altKey) {
    removePressedKey(pressedKeys, pressedKeyOrder, 'ALT')
  }
  if (!event.metaKey) {
    removePressedKey(pressedKeys, pressedKeyOrder, 'WIN')
  }
}

function formatKeybind(keys: string[]) {
  const parts = [
    ...modifierKeyOrder.filter((modifier) => keys.includes(modifier)),
    ...keys.filter((key) => !isModifierKey(key)),
  ]

  return parts.join('+')
}

function RecordIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48">
      <path d="M28.8 24a4.8 4.8 0 1 1-9.6 0 4.8 4.8 0 0 1 9.6 0Z" />
      <path d="M13.2 27.6a1.2 1.2 0 0 1 1.2 1.2v2.4a2.4 2.4 0 0 0 2.4 2.4h2.4a1.2 1.2 0 1 1 0 2.4h-2.4a4.8 4.8 0 0 1-4.8-4.8v-2.4a1.2 1.2 0 0 1 1.2-1.2Z" />
      <path d="M36 31.2a4.8 4.8 0 0 1-4.8 4.8h-2.4a1.2 1.2 0 1 1 0-2.4h2.4a2.4 2.4 0 0 0 2.4-2.4v-2.4a1.2 1.2 0 1 1 2.4 0v2.4Z" />
      <path d="M31.2 12a4.8 4.8 0 0 1 4.8 4.8v2.4a1.2 1.2 0 1 1-2.4 0v-2.4a2.4 2.4 0 0 0-2.4-2.4h-2.4a1.2 1.2 0 1 1 0-2.4h2.4Z" />
      <path d="M20.4 13.2a1.2 1.2 0 0 1-1.2 1.2h-2.4a2.4 2.4 0 0 0-2.4 2.4v2.4a1.2 1.2 0 1 1-2.4 0v-2.4a4.8 4.8 0 0 1 4.8-4.8h2.4a1.2 1.2 0 0 1 1.2 1.2Z" />
    </svg>
  )
}

function EditorQuickInsertKeyboardControls({
  onConfirm,
  shouldKeepOpen,
}: EditorQuickInsertKeyboardControlsProps) {
  const { t } = useTranslation()
  const [keybind, setKeybind] = useState('')
  const [recordingText, setRecordingText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const recordButtonRef = useRef<HTMLButtonElement | null>(null)
  const clearIconUrl = `${import.meta.env.BASE_URL}icons/Failed.svg`
  const placeholder = t(
    'quickInsert.keyboard.placeholder',
    'Press keys to record',
  )

  useEffect(() => {
    if (!isRecording) {
      return
    }

    const pressedKeys = new Set<string>()
    const pressedKeyOrder: string[] = []
    let pendingKeybind = ''
    let hasRecordedKey = false

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopImmediatePropagation()

      if (event.repeat) {
        return
      }

      addCurrentModifierKeys(event, pressedKeys, pressedKeyOrder)

      const keyLabel = getKeyLabel(event.key)
      if (keyLabel) {
        addPressedKey(pressedKeys, pressedKeyOrder, keyLabel)
      }

      pendingKeybind = formatKeybind(pressedKeyOrder)
      if (!pendingKeybind) {
        return
      }

      hasRecordedKey = true
      setRecordingText(pendingKeybind)
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopImmediatePropagation()

      const keyLabel = getKeyLabel(event.key)
      if (keyLabel) {
        removePressedKey(pressedKeys, pressedKeyOrder, keyLabel)
      }

      removeReleasedModifierKeys(event, pressedKeys, pressedKeyOrder)

      if (hasRecordedKey && pressedKeys.size === 0) {
        setKeybind(pendingKeybind)
        setRecordingText('')
        setIsRecording(false)
      }
    }

    const cancelRecording = () => {
      setRecordingText('')
      setIsRecording(false)
    }

    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('keyup', handleKeyUp, true)
    window.addEventListener('blur', cancelRecording)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('keyup', handleKeyUp, true)
      window.removeEventListener('blur', cancelRecording)
    }
  }, [isRecording])

  const toggleRecording = () => {
    if (isRecording) {
      setRecordingText('')
      setIsRecording(false)
      return
    }

    setRecordingText(keybind)
    setIsRecording(true)
    recordButtonRef.current?.focus()
  }

  const clearKeybind = () => {
    setRecordingText('')
    setIsRecording(false)
    setKeybind('')
    recordButtonRef.current?.focus()
  }

  const displayText = isRecording
    ? recordingText || keybind || placeholder
    : keybind || placeholder
  const isPlaceholder = !keybind && !recordingText

  return (
    <div className="editor-quick-insert-keyboard-controls">
      <div className="editor-quick-insert-keyboard-field">
        <span className="editor-quick-insert-keyboard-label">
          {t('quickInsert.keyboard.keybind', 'Keybind')}
        </span>
        <div
          className={`editor-quick-insert-keyboard-recorder${
            isRecording ? ' is-recording' : ''
          }`}
          data-recording={isRecording}
          data-quick-insert-keyboard-recorder="true"
        >
          <span
            aria-live="polite"
            className={`editor-quick-insert-keyboard-value${
              isPlaceholder ? ' is-placeholder' : ''
            }`}
          >
            {displayText}
          </span>
          <span className="editor-quick-insert-keyboard-actions">
            {keybind && !isRecording ? (
              <button
                aria-label={t(
                  'quickInsert.keyboard.clearKeybind',
                  'Clear keybind',
                )}
                className="editor-quick-insert-keyboard-action"
                onClick={clearKeybind}
                title={t(
                  'quickInsert.keyboard.clearKeybind',
                  'Clear keybind',
                )}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className="editor-quick-insert-keyboard-clear-icon"
                  style={{
                    WebkitMaskImage: `url("${clearIconUrl}")`,
                    maskImage: `url("${clearIconUrl}")`,
                  }}
                />
              </button>
            ) : null}
            <button
              ref={recordButtonRef}
              aria-label={
                isRecording
                  ? t(
                      'quickInsert.keyboard.stopRecording',
                      'Stop recording keybind',
                    )
                  : t('quickInsert.keyboard.record', 'Record keybind')
              }
              aria-pressed={isRecording}
              className="editor-quick-insert-keyboard-action editor-quick-insert-keyboard-record"
              onClick={toggleRecording}
              title={
                isRecording
                  ? t(
                      'quickInsert.keyboard.stopRecording',
                      'Stop recording keybind',
                    )
                  : t('quickInsert.keyboard.record', 'Record keybind')
              }
              type="button"
            >
              <RecordIcon />
            </button>
          </span>
        </div>
      </div>
      <button
        className="editor-quick-insert-keyboard-confirm"
        disabled={!keybind}
        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
          onConfirm({ keybind }, shouldKeepOpen(event))
        }}
        type="button"
      >
        {t('common.create')}
      </button>
    </div>
  )
}

export default EditorQuickInsertKeyboardControls
