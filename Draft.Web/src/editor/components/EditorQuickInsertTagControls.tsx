import {
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import type { CreateInlineTagMarkdownData } from '../commands/createInlineLinkMarkdown'

type EditorQuickInsertTagControlsProps = {
  onConfirm: (data: CreateInlineTagMarkdownData, keepOpen?: boolean) => void
}

const DEFAULT_TAG_COLOR = '#FFFFFF'
const validTagColorPattern = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/iu

function shouldKeepOpen(event: ReactMouseEvent<HTMLButtonElement>) {
  return event.shiftKey && event.button === 0
}

function getTagPreviewColor(value: string) {
  const trimmedValue = value.trim()

  return validTagColorPattern.test(trimmedValue)
    ? trimmedValue
    : DEFAULT_TAG_COLOR
}

function EditorQuickInsertTagControls({
  onConfirm,
}: EditorQuickInsertTagControlsProps) {
  const [text, setText] = useState('')
  const [color, setColor] = useState(DEFAULT_TAG_COLOR)
  const previewStyle = useMemo(
    () =>
      ({
        background: getTagPreviewColor(color),
      }) satisfies CSSProperties,
    [color],
  )

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
        <span className="editor-quick-insert-tag-label">Text</span>
        <input
          type="text"
          value={text}
          placeholder="Text"
          onChange={(event) => {
            setText(event.target.value)
          }}
          onKeyDown={handleInputKeyDown}
        />
      </label>
      <label className="editor-quick-insert-tag-field">
        <span className="editor-quick-insert-tag-label">Color</span>
        <span className="editor-quick-insert-tag-color-input">
          <span
            aria-hidden="true"
            className="editor-quick-insert-tag-color-preview"
            style={previewStyle}
          />
          <input
            type="text"
            value={color}
            placeholder="Color Code"
            onChange={(event) => {
              setColor(event.target.value)
            }}
            onKeyDown={handleInputKeyDown}
          />
        </span>
      </label>
      <button
        type="button"
        className="editor-quick-insert-tag-confirm"
        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
          confirm(shouldKeepOpen(event))
        }}
      >
        Create
      </button>
    </div>
  )
}

export default EditorQuickInsertTagControls
