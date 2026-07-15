import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import {
  getToggleWrappedEdits,
  type MarkdownSelectionOffsetRange,
  type MarkdownTextEdit,
} from '../../markdown'
import {
  createRangeFromOffsets,
  createSelectionFromOffsets,
  getSelectionOffsets,
  isEmptySelection,
} from './markdownSelection'

const SELECTED_TEXT_WRAPPING_EDIT_SOURCE = 'draft.selectedTextWrapping'

type SelectedTextWrapper = {
  closingMarker: string
  openingMarker: string
  type: 'markdown' | 'plain'
  upgradeToMarker?: string
}

type WrappingEditResult = {
  edits: MarkdownTextEdit[]
  nextSelection: MarkdownSelectionOffsetRange
}

type WrappingEditGroup = WrappingEditResult & {
  anchorOffset: number
  selectionIndex: number
}

const selectedTextWrappers: Record<string, SelectedTextWrapper> = {
  '"': {
    closingMarker: '"',
    openingMarker: '"',
    type: 'plain',
  },
  "'": {
    closingMarker: "'",
    openingMarker: "'",
    type: 'plain',
  },
  '(': {
    closingMarker: ')',
    openingMarker: '(',
    type: 'plain',
  },
  '*': {
    closingMarker: '*',
    openingMarker: '*',
    type: 'markdown',
    upgradeToMarker: '**',
  },
  '<': {
    closingMarker: '>',
    openingMarker: '<',
    type: 'plain',
  },
  '=': {
    closingMarker: '==',
    openingMarker: '==',
    type: 'markdown',
  },
  '[': {
    closingMarker: ']',
    openingMarker: '[',
    type: 'plain',
  },
  '_': {
    closingMarker: '_',
    openingMarker: '_',
    type: 'plain',
    upgradeToMarker: '__',
  },
  '`': {
    closingMarker: '`',
    openingMarker: '`',
    type: 'markdown',
  },
  '{': {
    closingMarker: '}',
    openingMarker: '{',
    type: 'plain',
  },
  '~': {
    closingMarker: '~~',
    openingMarker: '~~',
    type: 'markdown',
  },
}

function getMarkdownEditDelta(edit: MarkdownTextEdit) {
  return edit.text.length - (edit.endOffset - edit.startOffset)
}

function getEditGroupDelta(group: WrappingEditGroup) {
  return group.edits.reduce(
    (delta, edit) => delta + getMarkdownEditDelta(edit),
    0,
  )
}

function getEditGroupAnchor(
  selection: MarkdownSelectionOffsetRange,
  edits: MarkdownTextEdit[],
) {
  return edits.reduce(
    (anchorOffset, edit) => Math.min(anchorOffset, edit.startOffset),
    selection.startOffset,
  )
}

function createMonacoEditFromMarkdownEdit(
  model: monaco.editor.ITextModel,
  edit: MarkdownTextEdit,
) {
  return {
    forceMoveMarkers: true,
    range: createRangeFromOffsets(model, edit.startOffset, edit.endOffset),
    text: edit.text,
  } satisfies monaco.editor.IIdentifiedSingleEditOperation
}

function getMappedEditGroupSelections(groups: WrappingEditGroup[]) {
  let accumulatedDelta = 0
  const mappedSelections = new Map<number, MarkdownSelectionOffsetRange>()

  for (const group of [...groups].sort(
    (left, right) =>
      left.anchorOffset - right.anchorOffset ||
      left.selectionIndex - right.selectionIndex,
  )) {
    mappedSelections.set(group.selectionIndex, {
      endOffset: group.nextSelection.endOffset + accumulatedDelta,
      startOffset: group.nextSelection.startOffset + accumulatedDelta,
    })
    accumulatedDelta += getEditGroupDelta(group)
  }

  return [...groups]
    .sort((left, right) => left.selectionIndex - right.selectionIndex)
    .map((group) => mappedSelections.get(group.selectionIndex))
    .filter((selection): selection is MarkdownSelectionOffsetRange => !!selection)
}

function isTextWrapped(
  text: string,
  openingMarker: string,
  closingMarker: string,
) {
  return (
    text.startsWith(openingMarker) &&
    text.endsWith(closingMarker) &&
    text.length >= openingMarker.length + closingMarker.length
  )
}

function getInnerWrappedSelection(
  selection: MarkdownSelectionOffsetRange,
  openingMarker: string,
  closingMarker: string,
) {
  return {
    endOffset: selection.endOffset - closingMarker.length,
    startOffset: selection.startOffset + openingMarker.length,
  }
}

function getNoopAlreadyWrappedResult(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  selectedText: string,
  openingMarker: string,
  closingMarker: string,
): WrappingEditResult | null {
  if (isTextWrapped(selectedText, openingMarker, closingMarker)) {
    return {
      edits: [],
      nextSelection: getInnerWrappedSelection(
        selection,
        openingMarker,
        closingMarker,
      ),
    }
  }

  if (
    value.slice(
      selection.startOffset - openingMarker.length,
      selection.startOffset,
    ) === openingMarker &&
    value.slice(
      selection.endOffset,
      selection.endOffset + closingMarker.length,
    ) === closingMarker
  ) {
    return {
      edits: [],
      nextSelection: selection,
    }
  }

  return null
}

function isSingleMarkerWrappedText(text: string, marker: string) {
  return (
    isTextWrapped(text, marker, marker) &&
    !text.startsWith(marker.repeat(2)) &&
    !text.endsWith(marker.repeat(2))
  )
}

function isSelectionSurroundedBySingleMarker(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  marker: string,
) {
  const openingStartOffset = selection.startOffset - marker.length
  const closingStartOffset = selection.endOffset

  if (
    openingStartOffset < 0 ||
    value.slice(openingStartOffset, selection.startOffset) !== marker ||
    value.slice(closingStartOffset, closingStartOffset + marker.length) !==
      marker
  ) {
    return false
  }

  return (
    value.slice(openingStartOffset - marker.length, openingStartOffset) !==
      marker &&
    value.slice(selection.startOffset, selection.startOffset + marker.length) !==
      marker &&
    value.slice(selection.endOffset - marker.length, selection.endOffset) !==
      marker &&
    value.slice(
      closingStartOffset + marker.length,
      closingStartOffset + marker.length * 2,
    ) !== marker
  )
}

function getMarkerUpgradeResult(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  selectedText: string,
  marker: string,
  upgradeToMarker: string,
): WrappingEditResult | null {
  if (isTextWrapped(selectedText, upgradeToMarker, upgradeToMarker)) {
    return {
      edits: [],
      nextSelection: getInnerWrappedSelection(
        selection,
        upgradeToMarker,
        upgradeToMarker,
      ),
    }
  }

  if (isSingleMarkerWrappedText(selectedText, marker)) {
    const innerText = selectedText.slice(
      marker.length,
      selectedText.length - marker.length,
    )

    return {
      edits: [
        {
          endOffset: selection.startOffset + marker.length,
          startOffset: selection.startOffset,
          text: upgradeToMarker,
        },
        {
          endOffset: selection.endOffset,
          startOffset: selection.endOffset - marker.length,
          text: upgradeToMarker,
        },
      ],
      nextSelection: {
        endOffset:
          selection.startOffset + upgradeToMarker.length + innerText.length,
        startOffset: selection.startOffset + upgradeToMarker.length,
      },
    }
  }

  if (isSelectionSurroundedBySingleMarker(value, selection, marker)) {
    const markerDelta = upgradeToMarker.length - marker.length

    return {
      edits: [
        {
          endOffset: selection.startOffset,
          startOffset: selection.startOffset - marker.length,
          text: upgradeToMarker,
        },
        {
          endOffset: selection.endOffset + marker.length,
          startOffset: selection.endOffset,
          text: upgradeToMarker,
        },
      ],
      nextSelection: {
        endOffset: selection.endOffset + markerDelta,
        startOffset: selection.startOffset + markerDelta,
      },
    }
  }

  if (
    value.slice(
      selection.startOffset - upgradeToMarker.length,
      selection.startOffset,
    ) === upgradeToMarker &&
    value.slice(
      selection.endOffset,
      selection.endOffset + upgradeToMarker.length,
    ) === upgradeToMarker
  ) {
    return {
      edits: [],
      nextSelection: selection,
    }
  }

  return null
}

function getPlainWrapResult(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  selectedText: string,
  wrapper: SelectedTextWrapper,
): WrappingEditResult {
  const upgradeResult = wrapper.upgradeToMarker
    ? getMarkerUpgradeResult(
        value,
        selection,
        selectedText,
        wrapper.openingMarker,
        wrapper.upgradeToMarker,
      )
    : null

  if (upgradeResult) {
    return upgradeResult
  }

  const noopResult = getNoopAlreadyWrappedResult(
    value,
    selection,
    selectedText,
    wrapper.openingMarker,
    wrapper.closingMarker,
  )

  if (noopResult) {
    return noopResult
  }

  return {
    edits: [
      {
        endOffset: selection.endOffset,
        startOffset: selection.endOffset,
        text: wrapper.closingMarker,
      },
      {
        endOffset: selection.startOffset,
        startOffset: selection.startOffset,
        text: wrapper.openingMarker,
      },
    ],
    nextSelection: {
      endOffset: selection.endOffset + wrapper.openingMarker.length,
      startOffset: selection.startOffset + wrapper.openingMarker.length,
    },
  }
}

function getMarkdownWrapResult(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  selectedText: string,
  wrapper: SelectedTextWrapper,
): WrappingEditResult {
  const upgradeResult = wrapper.upgradeToMarker
    ? getMarkerUpgradeResult(
        value,
        selection,
        selectedText,
        wrapper.openingMarker,
        wrapper.upgradeToMarker,
      )
    : null

  if (upgradeResult) {
    return upgradeResult
  }

  return getToggleWrappedEdits(
    value,
    selection,
    selectedText,
    wrapper.openingMarker,
    wrapper.closingMarker,
    'wrap',
  )
}

function getWrappingEditGroup(
  value: string,
  model: monaco.editor.ITextModel,
  selection: monaco.Selection,
  wrapper: SelectedTextWrapper,
  selectionIndex: number,
): WrappingEditGroup {
  const selectionOffsets = getSelectionOffsets(model, selection)
  const selectedText = model.getValueInRange(selection)
  const result =
    wrapper.type === 'markdown'
      ? getMarkdownWrapResult(value, selectionOffsets, selectedText, wrapper)
      : getPlainWrapResult(value, selectionOffsets, selectedText, wrapper)

  return {
    ...result,
    anchorOffset: getEditGroupAnchor(selectionOffsets, result.edits),
    selectionIndex,
  }
}

export function wrapSelectedTextForTypedCharacter(
  editor: monaco.editor.IStandaloneCodeEditor,
  typedCharacter: string,
  beforeEdit?: () => void,
) {
  const wrapper = selectedTextWrappers[typedCharacter]
  const model = editor.getModel()
  const selections = editor.getSelections()

  if (
    !wrapper ||
    !model ||
    !selections ||
    selections.length === 0 ||
    selections.some(isEmptySelection)
  ) {
    return false
  }

  const value = model.getValue()
  const editGroups = selections.map((selection, selectionIndex) =>
    getWrappingEditGroup(value, model, selection, wrapper, selectionIndex),
  )
  const edits = editGroups.flatMap((group) =>
    group.edits.map((edit) => createMonacoEditFromMarkdownEdit(model, edit)),
  )
  const nextSelections = getMappedEditGroupSelections(editGroups)

  beforeEdit?.()

  if (edits.length > 0) {
    editor.pushUndoStop()
    editor.executeEdits(SELECTED_TEXT_WRAPPING_EDIT_SOURCE, edits)
  }

  if (nextSelections.length > 0) {
    editor.setSelections(
      nextSelections.map(({ endOffset, startOffset }) =>
        createSelectionFromOffsets(model, startOffset, endOffset),
      ),
    )
  }

  if (edits.length > 0) {
    editor.pushUndoStop()
  }

  editor.focus()
  return true
}
