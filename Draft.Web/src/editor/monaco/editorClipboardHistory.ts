import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { postCopiedPlainTextToHostClipboard } from '../../clipboard/clipboardHistoryBridge'

type PlainTextToCopy = string | string[]

function getPlainTextToCopy(
  model: monaco.editor.ITextModel,
  selections: monaco.Selection[],
  emptySelectionClipboard: boolean,
): PlainTextToCopy {
  const ranges = [...selections].sort(monaco.Range.compareRangesUsingStarts)
  const hasNonEmptyRange = ranges.some((range) => !range.isEmpty())

  if (!hasNonEmptyRange) {
    if (!emptySelectionClipboard) {
      return ''
    }

    let previousLineNumber = 0
    let result = ''

    for (const range of ranges) {
      if (range.startLineNumber === previousLineNumber) {
        continue
      }

      result += `${model.getLineContent(range.startLineNumber)}\r\n`
      previousLineNumber = range.startLineNumber
    }

    return result
  }

  const hasEmptyRange = ranges.some((range) => range.isEmpty())

  if (hasEmptyRange && emptySelectionClipboard) {
    const result: string[] = []
    let previousLineNumber = 0

    for (const range of ranges) {
      const lineNumber = range.startLineNumber

      if (range.isEmpty()) {
        if (lineNumber !== previousLineNumber) {
          result.push(model.getLineContent(lineNumber))
        }
      } else {
        result.push(
          model.getValueInRange(
            range,
            monaco.editor.EndOfLinePreference.CRLF,
          ),
        )
      }

      previousLineNumber = lineNumber
    }

    return result.length === 1 ? result[0] : result
  }

  const result = ranges
    .filter((range) => !range.isEmpty())
    .map((range) =>
      model.getValueInRange(range, monaco.editor.EndOfLinePreference.CRLF),
    )

  return result.length === 1 ? result[0] : result
}

function getEditorClipboardText(
  editor: monaco.editor.IStandaloneCodeEditor,
) {
  const model = editor.getModel()
  const selections = editor.getSelections()

  if (!model || !selections || selections.length === 0) {
    return ''
  }

  const textToCopy = getPlainTextToCopy(
    model,
    selections,
    editor.getOption(monaco.editor.EditorOption.emptySelectionClipboard),
  )

  return Array.isArray(textToCopy)
    ? textToCopy.join(model.getEOL())
    : textToCopy
}

export function registerEditorClipboardHistoryBridge(
  editor: monaco.editor.IStandaloneCodeEditor,
): monaco.IDisposable {
  const domNode = editor.getDomNode()

  if (!domNode) {
    return { dispose() {} }
  }

  const handleClipboardEvent = () => {
    postCopiedPlainTextToHostClipboard(getEditorClipboardText(editor))
  }

  domNode.addEventListener('copy', handleClipboardEvent)
  domNode.addEventListener('cut', handleClipboardEvent)

  return {
    dispose() {
      domNode.removeEventListener('copy', handleClipboardEvent)
      domNode.removeEventListener('cut', handleClipboardEvent)
    },
  }
}
