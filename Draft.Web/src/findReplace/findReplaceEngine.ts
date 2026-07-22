import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import type { WorkspaceFindReplaceOptionValues } from './findReplaceOptions'

const MAX_VISIBLE_FIND_RESULT_COUNT = 10_000
const VISIBLE_FIND_RESULT_QUERY_LIMIT = MAX_VISIBLE_FIND_RESULT_COUNT + 1
const MAX_REPLACE_ALL_RESULT_COUNT = 1_073_741_824
const FIND_REPLACE_EDIT_SOURCE = 'workspace-find-replace'

export type EditorFindMatchesResult = {
  hasMoreMatches: boolean
  invalidRegex: boolean
  matches: readonly monaco.editor.FindMatch[]
}

function isValidRegex(pattern: string, matchCase: boolean) {
  try {
    new RegExp(pattern, matchCase ? 'u' : 'iu')
    return true
  } catch {
    return false
  }
}

export function findEditorMatches(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  searchText: string,
  options: WorkspaceFindReplaceOptionValues,
): EditorFindMatchesResult {
  const result = findEditorMatchesWithLimit(
    editor,
    searchText,
    options,
    VISIBLE_FIND_RESULT_QUERY_LIMIT,
  )

  return {
    ...result,
    hasMoreMatches: result.matches.length > MAX_VISIBLE_FIND_RESULT_COUNT,
    matches: result.matches.slice(0, MAX_VISIBLE_FIND_RESULT_COUNT),
  }
}

export function findAllEditorMatches(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  searchText: string,
  options: WorkspaceFindReplaceOptionValues,
) {
  return findEditorMatchesWithLimit(
    editor,
    searchText,
    options,
    MAX_REPLACE_ALL_RESULT_COUNT,
  )
}

function findEditorMatchesWithLimit(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  searchText: string,
  options: WorkspaceFindReplaceOptionValues,
  resultLimit: number,
): EditorFindMatchesResult {
  if (!editor) {
    return { hasMoreMatches: false, invalidRegex: false, matches: [] }
  }

  const model = editor.getModel()

  if (!model || searchText.length === 0) {
    return { hasMoreMatches: false, invalidRegex: false, matches: [] }
  }

  if (options.regex && !isValidRegex(searchText, options.matchCase)) {
    return { hasMoreMatches: false, invalidRegex: true, matches: [] }
  }

  try {
    return {
      hasMoreMatches: false,
      invalidRegex: false,
      matches: model.findMatches(
        searchText,
        false,
        options.regex,
        options.matchCase,
        options.wholeWord
          ? editor.getOption(monaco.editor.EditorOption.wordSeparators)
          : null,
        options.regex,
        resultLimit,
      ),
    }
  } catch {
    return {
      hasMoreMatches: false,
      invalidRegex: options.regex,
      matches: [],
    }
  }
}

type RegexReplacementCaseOperation = 'L' | 'U' | 'l' | 'u'

function substituteRegexCapture(
  captureIndex: number,
  captures: readonly (string | undefined)[],
) {
  if (captureIndex === 0) {
    return captures[0] ?? ''
  }

  let remainingCaptureIndex = captureIndex
  let remainder = ''

  while (remainingCaptureIndex > 0) {
    if (remainingCaptureIndex < captures.length) {
      return `${captures[remainingCaptureIndex] ?? ''}${remainder}`
    }

    remainder = `${remainingCaptureIndex % 10}${remainder}`
    remainingCaptureIndex = Math.floor(remainingCaptureIndex / 10)
  }

  return `$${remainder}`
}

function applyRegexReplacementCaseOperations(
  value: string,
  caseOperations: readonly RegexReplacementCaseOperation[],
) {
  if (caseOperations.length === 0) {
    return value
  }

  let caseOperationIndex = 0
  let result = ''

  for (let characterIndex = 0; characterIndex < value.length; characterIndex += 1) {
    if (caseOperationIndex >= caseOperations.length) {
      result += value.slice(characterIndex)
      break
    }

    const character = value[characterIndex]

    switch (caseOperations[caseOperationIndex]) {
      case 'U':
        result += character.toUpperCase()
        break
      case 'u':
        result += character.toUpperCase()
        caseOperationIndex += 1
        break
      case 'L':
        result += character.toLowerCase()
        break
      case 'l':
        result += character.toLowerCase()
        caseOperationIndex += 1
        break
    }
  }

  return result
}

function expandRegexReplacement(
  replacementText: string,
  captures: readonly (string | undefined)[],
) {
  const caseOperations: RegexReplacementCaseOperation[] = []
  let result = ''

  for (
    let characterIndex = 0;
    characterIndex < replacementText.length;
    characterIndex += 1
  ) {
    const character = replacementText[characterIndex]
    const nextCharacter = replacementText[characterIndex + 1]

    if (character === '\\' && nextCharacter !== undefined) {
      if (nextCharacter === '\\') {
        result += '\\'
        characterIndex += 1
        continue
      }

      if (nextCharacter === 'n') {
        result += '\n'
        characterIndex += 1
        continue
      }

      if (nextCharacter === 't') {
        result += '\t'
        characterIndex += 1
        continue
      }

      if (
        nextCharacter === 'U' ||
        nextCharacter === 'u' ||
        nextCharacter === 'L' ||
        nextCharacter === 'l'
      ) {
        caseOperations.push(nextCharacter)
        characterIndex += 1
        continue
      }

      result += `${character}${nextCharacter}`
      characterIndex += 1
      continue
    }

    if (character !== '$' || nextCharacter === undefined) {
      result += character
      continue
    }

    if (nextCharacter === '$') {
      result += '$'
      characterIndex += 1
      continue
    }

    let captureIndex: number | null = null
    let consumedCharacterCount = 1

    if (nextCharacter === '&' || nextCharacter === '0') {
      captureIndex = 0
    } else if (/^[1-9]$/u.test(nextCharacter)) {
      captureIndex = Number(nextCharacter)
      const secondDigit = replacementText[characterIndex + 2]

      if (secondDigit !== undefined && /^[0-9]$/u.test(secondDigit)) {
        captureIndex = captureIndex * 10 + Number(secondDigit)
        consumedCharacterCount = 2
      }
    }

    if (captureIndex === null) {
      result += `${character}${nextCharacter}`
      characterIndex += 1
      continue
    }

    result += applyRegexReplacementCaseOperations(
      substituteRegexCapture(captureIndex, captures),
      caseOperations,
    )
    caseOperations.length = 0
    characterIndex += consumedCharacterCount
  }

  return result
}

export function getEditorFindReplacementText(
  model: monaco.editor.ITextModel,
  match: monaco.editor.FindMatch,
  replacementText: string,
  useRegex: boolean,
) {
  if (!useRegex) {
    return replacementText
  }

  const captures = match.matches ?? [model.getValueInRange(match.range)]
  return expandRegexReplacement(replacementText, captures)
}

export function replaceEditorFindMatches(
  editor: monaco.editor.IStandaloneCodeEditor,
  matches: readonly monaco.editor.FindMatch[],
  replacementText: string,
  useRegex: boolean,
) {
  const model = editor.getModel()

  if (!model || matches.length === 0) {
    return false
  }

  const edits = matches
    .map((match) => ({
      forceMoveMarkers: true,
      range: match.range,
      startOffset: model.getOffsetAt(match.range.getStartPosition()),
      text: getEditorFindReplacementText(
        model,
        match,
        replacementText,
        useRegex,
      ),
    }))
    .sort((left, right) => right.startOffset - left.startOffset)
    .map(({ forceMoveMarkers, range, text }) => ({
      forceMoveMarkers,
      range,
      text,
    }))

  editor.pushUndoStop()

  try {
    return editor.executeEdits(FIND_REPLACE_EDIT_SOURCE, edits)
  } finally {
    editor.pushUndoStop()
  }
}
