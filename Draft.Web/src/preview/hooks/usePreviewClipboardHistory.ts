import { useEffect, type RefObject } from 'react'
import { postCopiedPlainTextToHostClipboard } from '../../clipboard/clipboardHistoryBridge'

function selectionBelongsToElement(
  element: HTMLElement,
  selection: Selection,
) {
  return (
    (selection.anchorNode !== null && element.contains(selection.anchorNode)) ||
    (selection.focusNode !== null && element.contains(selection.focusNode))
  )
}

export function usePreviewClipboardHistory(
  previewContentElementRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const previewContentElement = previewContentElementRef.current

    if (!previewContentElement) {
      return
    }

    const handleCopy = () => {
      const selection = window.getSelection()
      const selectedText = selection?.toString() ?? ''

      if (
        selectedText.length === 0 ||
        !selection ||
        !selectionBelongsToElement(previewContentElement, selection)
      ) {
        return
      }

      postCopiedPlainTextToHostClipboard(selectedText)
    }

    document.addEventListener('copy', handleCopy, true)

    return () => {
      document.removeEventListener('copy', handleCopy, true)
    }
  }, [previewContentElementRef])
}
