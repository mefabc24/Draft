import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { HexColorPicker } from 'react-colorful'
import type { CreateInlineTagMarkdownData } from '../commands/createInlineLinkMarkdown'
import { useTranslation } from '../../localization/useTranslation'

type EditorQuickInsertTagControlsProps = {
  onConfirm: (data: CreateInlineTagMarkdownData, keepOpen?: boolean) => void
  shouldKeepOpen: (event: ReactMouseEvent<HTMLButtonElement>) => boolean
}

const DEFAULT_TAG_COLOR = '#FFFFFF'
const validTagColorPattern = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/iu

function getTagPreviewColor(value: string) {
  const trimmedValue = value.trim()

  return validTagColorPattern.test(trimmedValue)
    ? trimmedValue
    : DEFAULT_TAG_COLOR
}

function EditorQuickInsertTagControls({
  onConfirm,
  shouldKeepOpen,
}: EditorQuickInsertTagControlsProps) {
  const { t } = useTranslation()
  const colorInputId = useId()
  const colorFieldRef = useRef<HTMLDivElement | null>(null)
  const [text, setText] = useState('')
  const [color, setColor] = useState(DEFAULT_TAG_COLOR)
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)
  const pickerColor = getTagPreviewColor(color)
  const previewStyle = useMemo(
    () =>
      ({
        background: pickerColor,
      }) satisfies CSSProperties,
    [pickerColor],
  )

  useEffect(() => {
    if (!isColorPickerOpen) {
      return
    }

    const closePickerOnOutsidePointerDown = (event: PointerEvent) => {
      const { target } = event

      if (
        target instanceof Node &&
        colorFieldRef.current?.contains(target)
      ) {
        return
      }

      setIsColorPickerOpen(false)
    }

    document.addEventListener('pointerdown', closePickerOnOutsidePointerDown)

    return () => {
      document.removeEventListener(
        'pointerdown',
        closePickerOnOutsidePointerDown,
      )
    }
  }, [isColorPickerOpen])

  const toggleColorPicker = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      setIsColorPickerOpen((currentValue) => !currentValue)
    },
    [],
  )

  const handlePickerColorChange = useCallback((nextColor: string) => {
    setColor(nextColor.toUpperCase())
  }, [])

  const confirm = (keepOpen = false) => {
    onConfirm({ color, text }, keepOpen)
  }

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return
    }

    event.preventDefault()
    confirm(event.shiftKey)
  }

  return (
    <div className="editor-quick-insert-tag-controls">
      <label className="editor-quick-insert-tag-field">
        <span className="editor-quick-insert-tag-label">
          {t('quickInsert.tag.text')}
        </span>
        <input
          type="text"
          value={text}
          placeholder={t('quickInsert.tag.text')}
          onChange={(event) => {
            setText(event.target.value)
          }}
          onKeyDown={handleInputKeyDown}
        />
      </label>
      <div
        className="editor-quick-insert-tag-field editor-quick-insert-tag-color-field"
        ref={colorFieldRef}
      >
        <label className="editor-quick-insert-tag-label" htmlFor={colorInputId}>
          {t('quickInsert.tag.color')}
        </label>
        <span className="editor-quick-insert-tag-color-input">
          <button
            type="button"
            className="editor-quick-insert-tag-color-preview-button"
            aria-label={t(
              'quickInsert.tag.toggleColorPicker',
              'Toggle tag color picker',
            )}
            aria-expanded={isColorPickerOpen}
            onClick={toggleColorPicker}
          >
            <span
              aria-hidden="true"
              className="editor-quick-insert-tag-color-preview"
              style={previewStyle}
            />
          </button>
          <input
            id={colorInputId}
            type="text"
            value={color}
            placeholder={t('quickInsert.tag.colorCode')}
            onChange={(event) => {
              setColor(event.target.value)
            }}
            onKeyDown={handleInputKeyDown}
          />
        </span>
        {isColorPickerOpen ? (
          <div className="editor-quick-insert-tag-color-picker">
            <HexColorPicker
              color={pickerColor}
              onChange={handlePickerColorChange}
            />
          </div>
        ) : null}
      </div>
      <button
        type="button"
        className="editor-quick-insert-tag-confirm"
        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
          confirm(shouldKeepOpen(event))
        }}
      >
        {t('common.create')}
      </button>
    </div>
  )
}

export default EditorQuickInsertTagControls
