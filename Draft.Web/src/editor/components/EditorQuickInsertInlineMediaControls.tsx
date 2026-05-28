import { useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react'
import type {
  CreateInlineImageMarkdownData,
  CreateInlineLinkMarkdownData,
} from '../commands/createInlineLinkMarkdown'

type EditorQuickInsertInlineMediaControlsProps =
  | {
      onConfirm: (
        data: CreateInlineImageMarkdownData,
        keepOpen?: boolean,
      ) => void
      type: 'image'
    }
  | {
      onConfirm: (
        data: CreateInlineLinkMarkdownData,
        keepOpen?: boolean,
      ) => void
      type: 'link'
    }

function shouldKeepOpen(event: ReactMouseEvent<HTMLButtonElement>) {
  return event.shiftKey && event.button === 0
}

function EditorQuickInsertInlineMediaControls(
  props: EditorQuickInsertInlineMediaControlsProps,
) {
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const isImage = props.type === 'image'

  const confirm = (keepOpen = false) => {
    if (props.type === 'image') {
      props.onConfirm({ altText: text, url }, keepOpen)
      return
    }

    props.onConfirm({ text, url }, keepOpen)
  }

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return
    }

    event.preventDefault()
    confirm(event.shiftKey)
  }

  return (
    <div className="editor-quick-insert-inline-media-controls">
      <label className="editor-quick-insert-inline-media-field">
        <span className="editor-quick-insert-inline-media-label">
          {isImage ? 'Placeholder text' : 'Display text'}
        </span>
        <input
          type="text"
          value={text}
          placeholder={isImage ? 'Alt text' : 'Display text'}
          onChange={(event) => {
            setText(event.target.value)
          }}
          onKeyDown={handleInputKeyDown}
        />
      </label>
      <label className="editor-quick-insert-inline-media-field">
        <span className="editor-quick-insert-inline-media-label">
          {isImage ? 'Image link' : 'Link'}
        </span>
        <input
          type="text"
          value={url}
          placeholder={isImage ? 'Image URL' : 'URL'}
          onChange={(event) => {
            setUrl(event.target.value)
          }}
          onKeyDown={handleInputKeyDown}
        />
      </label>
      <button
        type="button"
        className="editor-quick-insert-inline-media-confirm"
        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
          confirm(shouldKeepOpen(event))
        }}
      >
        Create
      </button>
    </div>
  )
}

export default EditorQuickInsertInlineMediaControls
