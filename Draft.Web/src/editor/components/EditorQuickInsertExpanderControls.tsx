import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import type { CreateExpanderMarkdownData } from '../commands/createInlineLinkMarkdown'
import { useTranslation } from '../../localization/useTranslation'

type EditorQuickInsertExpanderControlsProps = {
  onConfirm: (data: CreateExpanderMarkdownData, keepOpen?: boolean) => void
}

const contentMaxRows = 8

function shouldKeepOpen(event: ReactMouseEvent<HTMLButtonElement>) {
  return event.shiftKey && event.button === 0
}

function getTextareaLineHeight(textarea: HTMLTextAreaElement) {
  const lineHeight = Number.parseFloat(getComputedStyle(textarea).lineHeight)

  return Number.isFinite(lineHeight) ? lineHeight : 19
}

function resizeContentTextarea(textarea: HTMLTextAreaElement) {
  const lineHeight = getTextareaLineHeight(textarea)
  const maxHeight = lineHeight * contentMaxRows

  textarea.style.height = 'auto'

  const nextHeight = Math.min(textarea.scrollHeight, maxHeight)
  textarea.style.height = `${nextHeight}px`
  textarea.style.overflowY =
    textarea.scrollHeight > maxHeight ? 'auto' : 'hidden'
}

function EditorQuickInsertExpanderControls({
  onConfirm,
}: EditorQuickInsertExpanderControlsProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const contentRef = useRef<HTMLTextAreaElement | null>(null)

  useLayoutEffect(() => {
    const textarea = contentRef.current

    if (!textarea) {
      return
    }

    resizeContentTextarea(textarea)
  }, [content])

  const confirm = (keepOpen = false) => {
    onConfirm({ content, title }, keepOpen)
  }

  const handleTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return
    }

    event.preventDefault()
    confirm(event.shiftKey)
  }

  return (
    <div className="editor-quick-insert-expander-controls">
      <label className="editor-quick-insert-expander-field">
        <span className="editor-quick-insert-expander-label">
          {t('quickInsert.expander.title')}
        </span>
        <input
          type="text"
          value={title}
          placeholder={t('quickInsert.expander.title')}
          onChange={(event) => {
            setTitle(event.target.value)
          }}
          onKeyDown={handleTitleKeyDown}
        />
      </label>
      <label className="editor-quick-insert-expander-field">
        <span className="editor-quick-insert-expander-label">
          {t('quickInsert.expander.content')}
        </span>
        <textarea
          ref={contentRef}
          rows={1}
          value={content}
          placeholder={t('quickInsert.expander.content')}
          onChange={(event) => {
            setContent(event.target.value)
          }}
        />
      </label>
      <button
        type="button"
        className="editor-quick-insert-expander-confirm"
        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
          confirm(shouldKeepOpen(event))
        }}
      >
        {t('common.create')}
      </button>
    </div>
  )
}

export default EditorQuickInsertExpanderControls
