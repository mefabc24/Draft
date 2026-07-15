import { useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { useTranslation } from '../../localization/useTranslation'
import type {
  CreateInlineImageMarkdownData,
  CreateInlineLinkMarkdownData,
} from '../commands/createInlineLinkMarkdown'

type EditorQuickInsertInlineMediaControlsProps = (
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
) & {
  shouldKeepOpen: (event: ReactMouseEvent<HTMLButtonElement>) => boolean
}

function EditorQuickInsertInlineMediaControls(
  props: EditorQuickInsertInlineMediaControlsProps,
) {
  const { t } = useTranslation()
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
          {isImage
            ? t('quickInsert.inlineMedia.placeholderText')
            : t('quickInsert.inlineMedia.displayText')}
        </span>
        <input
          type="text"
          value={text}
          placeholder={
            isImage
              ? t('quickInsert.inlineMedia.altText')
              : t('quickInsert.inlineMedia.displayText')
          }
          onChange={(event) => {
            setText(event.target.value)
          }}
          onKeyDown={handleInputKeyDown}
        />
      </label>
      <label className="editor-quick-insert-inline-media-field">
        <span className="editor-quick-insert-inline-media-label">
          {isImage
            ? t('quickInsert.inlineMedia.imageLink')
            : t('toolbar.link')}
        </span>
        <input
          type="text"
          value={url}
          placeholder={
            isImage
              ? t('quickInsert.inlineMedia.imageUrl')
              : t('quickInsert.inlineMedia.url')
          }
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
          confirm(props.shouldKeepOpen(event))
        }}
      >
        {t('common.create')}
      </button>
    </div>
  )
}

export default EditorQuickInsertInlineMediaControls
