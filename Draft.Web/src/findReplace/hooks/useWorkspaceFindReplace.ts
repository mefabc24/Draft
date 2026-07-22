import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import {
  findAllEditorMatches,
  findEditorMatches,
  getEditorFindReplacementText,
  replaceEditorFindMatches,
} from '../findReplaceEngine'
import {
  defaultWorkspaceFindReplaceOptionValues,
  type WorkspaceFindReplaceOptionId,
  type WorkspaceFindReplaceOptionValues,
} from '../findReplaceOptions'

function getFirstMatchIndexAtOrAfterOffset(
  model: monaco.editor.ITextModel,
  matches: readonly monaco.editor.FindMatch[],
  offset: number,
) {
  const matchIndex = matches.findIndex(
    (match) => model.getOffsetAt(match.range.getStartPosition()) >= offset,
  )

  return matchIndex >= 0 ? matchIndex : matches.length > 0 ? 0 : -1
}

function getInitialMatchIndex(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  matches: readonly monaco.editor.FindMatch[],
) {
  const model = editor?.getModel()
  const selection = editor?.getSelection()

  if (!model || !selection || matches.length === 0) {
    return matches.length > 0 ? 0 : -1
  }

  return getFirstMatchIndexAtOrAfterOffset(
    model,
    matches,
    model.getOffsetAt(selection.getStartPosition()),
  )
}

function revealEditorMatch(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  match: monaco.editor.FindMatch | undefined,
) {
  if (!editor || !match) {
    return
  }

  editor.setSelection(match.range, 'workspace-find-replace')
  editor.revealRangeInCenterIfOutsideViewport(
    match.range,
    monaco.editor.ScrollType.Smooth,
  )
}

function getModelTextLength(model: monaco.editor.ITextModel, text: string) {
  return text.replace(/\r\n|\r|\n/gu, model.getEOL()).length
}

export function useWorkspaceFindReplace(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  isOpen: boolean,
) {
  const [searchText, setSearchTextState] = useState('')
  const [replacementText, setReplacementText] = useState('')
  const [replaceAllEnabled, setReplaceAllEnabled] = useState(true)
  const [optionValues, setOptionValues] =
    useState<WorkspaceFindReplaceOptionValues>(
      defaultWorkspaceFindReplaceOptionValues,
    )
  const [activeMatchIndex, setActiveMatchIndex] = useState(0)
  const [modelRevision, setModelRevision] = useState(0)
  const decorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null)
  const applyingEditsRef = useRef(false)
  const previousEditorRef = useRef(editor)
  const previousIsOpenRef = useRef(false)

  useEffect(() => {
    if (!editor || !isOpen) {
      decorationCollectionRef.current = null
      return
    }

    const decorationCollection = editor.createDecorationsCollection()
    const refreshMatches = () => {
      if (!applyingEditsRef.current) {
        setModelRevision((currentRevision) => currentRevision + 1)
      }
    }
    const contentDisposable = editor.onDidChangeModelContent(refreshMatches)
    const modelDisposable = editor.onDidChangeModel(refreshMatches)
    decorationCollectionRef.current = decorationCollection

    return () => {
      contentDisposable.dispose()
      modelDisposable.dispose()
      decorationCollection.clear()

      if (decorationCollectionRef.current === decorationCollection) {
        decorationCollectionRef.current = null
      }
    }
  }, [editor, isOpen])

  const searchResult = useMemo(() => {
    if (!isOpen) {
      return {
        hasMoreMatches: false,
        invalidRegex: false,
        matches: [],
      }
    }

    void modelRevision
    return findEditorMatches(editor, searchText, optionValues)
  }, [editor, isOpen, modelRevision, optionValues, searchText])
  const normalizedActiveMatchIndex =
    searchResult.matches.length > 0
      ? Math.min(Math.max(activeMatchIndex, 0), searchResult.matches.length - 1)
      : -1
  const activeMatch =
    normalizedActiveMatchIndex >= 0
      ? searchResult.matches[normalizedActiveMatchIndex]
      : null

  useEffect(() => {
    const decorationCollection = decorationCollectionRef.current

    if (!decorationCollection) {
      return
    }

    if (!isOpen || searchResult.invalidRegex) {
      decorationCollection.clear()
      return
    }

    decorationCollection.set(
      searchResult.matches.map((match, matchIndex) => ({
        options: {
          className:
            matchIndex === normalizedActiveMatchIndex
              ? 'workspace-find-replace-editor-match is-current'
              : 'workspace-find-replace-editor-match',
          showIfCollapsed: true,
          stickiness:
            monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          zIndex: matchIndex === normalizedActiveMatchIndex ? 20 : 10,
        },
        range: match.range,
      })),
    )
  }, [isOpen, normalizedActiveMatchIndex, searchResult])

  useEffect(() => {
    const justOpened = isOpen && !previousIsOpenRef.current
    const editorChangedWhileOpen =
      isOpen && editor !== previousEditorRef.current

    previousEditorRef.current = editor
    previousIsOpenRef.current = isOpen

    if (justOpened || editorChangedWhileOpen) {
      revealEditorMatch(editor, activeMatch ?? undefined)
    }
  }, [activeMatch, editor, isOpen])

  const setSearchText = useCallback(
    (nextSearchText: string) => {
      const nextSearchResult = findEditorMatches(
        editor,
        nextSearchText,
        optionValues,
      )
      const nextMatchIndex = getInitialMatchIndex(
        editor,
        nextSearchResult.matches,
      )

      setSearchTextState(nextSearchText)
      setActiveMatchIndex(nextMatchIndex)
      revealEditorMatch(editor, nextSearchResult.matches[nextMatchIndex])
    },
    [editor, optionValues],
  )

  const toggleOption = useCallback(
    (optionId: WorkspaceFindReplaceOptionId) => {
      const nextOptionValues = {
        ...optionValues,
        [optionId]: !optionValues[optionId],
      }
      const nextSearchResult = findEditorMatches(
        editor,
        searchText,
        nextOptionValues,
      )
      const nextMatchIndex = getInitialMatchIndex(
        editor,
        nextSearchResult.matches,
      )

      setOptionValues(nextOptionValues)
      setActiveMatchIndex(nextMatchIndex)
      revealEditorMatch(editor, nextSearchResult.matches[nextMatchIndex])
    },
    [editor, optionValues, searchText],
  )

  const moveToMatch = useCallback(
    (direction: -1 | 1) => {
      if (searchResult.matches.length === 0) {
        return
      }

      const currentIndex =
        normalizedActiveMatchIndex >= 0
          ? normalizedActiveMatchIndex
          : direction > 0
            ? -1
            : 0
      const nextIndex =
        (currentIndex + direction + searchResult.matches.length) %
        searchResult.matches.length

      setActiveMatchIndex(nextIndex)
      revealEditorMatch(editor, searchResult.matches[nextIndex])
    },
    [editor, normalizedActiveMatchIndex, searchResult.matches],
  )

  const replace = useCallback(() => {
    const model = editor?.getModel()

    if (
      !editor ||
      !model ||
      searchResult.invalidRegex ||
      searchResult.matches.length === 0 ||
      normalizedActiveMatchIndex < 0
    ) {
      return
    }

    const currentMatch = searchResult.matches[normalizedActiveMatchIndex]
    const matchesToReplace = replaceAllEnabled
      ? findAllEditorMatches(editor, searchText, optionValues).matches
      : [currentMatch]
    let nextMatchAnchorOffset: number | null = null

    if (!replaceAllEnabled) {
      const currentStartOffset = model.getOffsetAt(
        currentMatch.range.getStartPosition(),
      )
      const currentEndOffset = model.getOffsetAt(
        currentMatch.range.getEndPosition(),
      )
      const currentReplacementText = getEditorFindReplacementText(
        model,
        currentMatch,
        replacementText,
        optionValues.regex,
      )

      if (searchResult.matches.length > 1) {
        const nextOldMatchIndex =
          (normalizedActiveMatchIndex + 1) % searchResult.matches.length
        const nextOldMatch = searchResult.matches[nextOldMatchIndex]
        const nextOldMatchOffset = model.getOffsetAt(
          nextOldMatch.range.getStartPosition(),
        )
        const replacementLengthDelta =
          getModelTextLength(model, currentReplacementText) -
          (currentEndOffset - currentStartOffset)

        nextMatchAnchorOffset =
          nextOldMatchOffset > currentStartOffset
            ? nextOldMatchOffset + replacementLengthDelta
            : nextOldMatchOffset
      } else {
        nextMatchAnchorOffset =
          currentStartOffset + getModelTextLength(model, currentReplacementText)
      }
    }

    applyingEditsRef.current = true
    let editsApplied: boolean

    try {
      editsApplied = replaceEditorFindMatches(
        editor,
        matchesToReplace,
        replacementText,
        optionValues.regex,
      )
    } finally {
      applyingEditsRef.current = false
    }

    if (!editsApplied) {
      return
    }

    const nextSearchResult = findEditorMatches(
      editor,
      searchText,
      optionValues,
    )
    const nextMatchIndex =
      nextMatchAnchorOffset === null
        ? getInitialMatchIndex(editor, nextSearchResult.matches)
        : getFirstMatchIndexAtOrAfterOffset(
            model,
            nextSearchResult.matches,
            nextMatchAnchorOffset,
          )

    setActiveMatchIndex(nextMatchIndex)
    setModelRevision((currentRevision) => currentRevision + 1)
    revealEditorMatch(editor, nextSearchResult.matches[nextMatchIndex])
  }, [
    editor,
    normalizedActiveMatchIndex,
    optionValues,
    replaceAllEnabled,
    replacementText,
    searchResult,
    searchText,
  ])

  return {
    activeMatchNumber:
      normalizedActiveMatchIndex >= 0 ? normalizedActiveMatchIndex + 1 : 0,
    canNavigate: searchResult.matches.length > 0,
    canReplace:
      !searchResult.invalidRegex && searchResult.matches.length > 0,
    goToNextMatch: () => moveToMatch(1),
    goToPreviousMatch: () => moveToMatch(-1),
    hasMoreMatches: searchResult.hasMoreMatches,
    invalidRegex: searchResult.invalidRegex,
    matchCount: searchResult.matches.length,
    optionValues,
    replace,
    replaceAllEnabled,
    replacementText,
    searchText,
    setReplaceAllEnabled,
    setReplacementText,
    setSearchText,
    toggleOption,
  }
}
