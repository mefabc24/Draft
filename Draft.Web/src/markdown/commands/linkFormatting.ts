import type {
  MarkdownSelectionOffsetRange,
  MarkdownTextEdit,
} from '../markdownTypes'
import {
  normalizeInlineSelectionRange,
  type NormalizedInlineSelectionRange,
} from './inlineSelectionNormalization'

export type MarkdownLinkContext = MarkdownSelectionOffsetRange & {
  label: string
  sourceText: string
  url: string
}

export type MarkdownImageContext = MarkdownLinkContext

type MarkdownInlineResourceKind = 'image' | 'link'

function getResourceOpenText(kind: MarkdownInlineResourceKind) {
  return kind === 'image' ? '![' : '['
}

function getResourceLabelStartOffset(
  resourceStartOffset: number,
  kind: MarkdownInlineResourceKind,
) {
  return resourceStartOffset + (kind === 'image' ? 1 : 0)
}

function getResourceStartOffset(
  value: string,
  labelStartOffset: number,
  kind: MarkdownInlineResourceKind,
) {
  const hasImagePrefix =
    labelStartOffset > 0 && value[labelStartOffset - 1] === '!'

  if (kind === 'image') {
    return hasImagePrefix ? labelStartOffset - 1 : null
  }

  return hasImagePrefix ? null : labelStartOffset
}

function getLineEndOffset(value: string, offset: number) {
  const lineBreakOffset = value.indexOf('\n', offset)

  return lineBreakOffset === -1 ? value.length : lineBreakOffset
}

function getResourceLabelEndOffset(value: string, labelStartOffset: number) {
  const lineEndOffset = getLineEndOffset(value, labelStartOffset)
  const labelEndOffset = value.indexOf('](', labelStartOffset + 1)

  if (labelEndOffset === -1 || labelEndOffset >= lineEndOffset) {
    return null
  }

  const firstLabelCloseOffset = value.indexOf(']', labelStartOffset + 1)
  const nestedLabelOpenOffset = value.indexOf('[', labelStartOffset + 1)

  if (
    firstLabelCloseOffset !== labelEndOffset ||
    (nestedLabelOpenOffset !== -1 && nestedLabelOpenOffset < labelEndOffset)
  ) {
    return null
  }

  return labelEndOffset
}

function isSelectedResourceLabel(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  kind: MarkdownInlineResourceKind,
) {
  const { endOffset, startOffset } = selection
  const labelStartOffset = startOffset - 1
  const resourceStartOffset =
    labelStartOffset >= 0
      ? getResourceStartOffset(value, labelStartOffset, kind)
      : null
  const linkClosePrefix = value.slice(endOffset, endOffset + 2)
  const lineEndOffset =
    labelStartOffset >= 0 ? getLineEndOffset(value, labelStartOffset) : -1
  const linkEndOffset =
    linkClosePrefix === '](' ? value.indexOf(')', endOffset + 2) : -1

  return {
    isSelectedLinkLabel:
      resourceStartOffset !== null &&
      value[labelStartOffset] === '[' &&
      linkEndOffset !== -1 &&
      linkEndOffset < lineEndOffset,
    linkEndOffset,
    resourceStartOffset,
  }
}

export function isSelectedLinkLabel(
  value: string,
  selection: MarkdownSelectionOffsetRange,
) {
  return isSelectedResourceLabel(value, selection, 'link')
}

export function isSelectedImageLabel(
  value: string,
  selection: MarkdownSelectionOffsetRange,
) {
  return isSelectedResourceLabel(value, selection, 'image')
}

export function getMarkdownLinkContext(
  value: string,
  selection: MarkdownSelectionOffsetRange,
): MarkdownLinkContext | null {
  return getMarkdownResourceContextForNormalizedSelection(
    value,
    normalizeInlineSelectionRange(value, selection),
    'link',
  )
}

export function getMarkdownImageContext(
  value: string,
  selection: MarkdownSelectionOffsetRange,
): MarkdownImageContext | null {
  return getMarkdownResourceContextForNormalizedSelection(
    value,
    normalizeInlineSelectionRange(value, selection),
    'image',
  )
}

function createMarkdownResourceContext(
  value: string,
  resourceStartOffset: number,
  labelStartOffset: number,
  labelEndOffset: number,
  resourceEndOffset: number,
): MarkdownLinkContext {
  return {
    endOffset: resourceEndOffset,
    label: value.slice(labelStartOffset + 1, labelEndOffset),
    sourceText: value.slice(resourceStartOffset, resourceEndOffset),
    startOffset: resourceStartOffset,
    url: value.slice(labelEndOffset + 2, resourceEndOffset - 1),
  }
}

function getMarkdownResourceContextFromLabelStart(
  value: string,
  labelStartOffset: number,
  kind: MarkdownInlineResourceKind,
): MarkdownLinkContext | null {
  const lineEndOffset = getLineEndOffset(value, labelStartOffset)
  const resourceStartOffset = getResourceStartOffset(
    value,
    labelStartOffset,
    kind,
  )

  if (
    resourceStartOffset === null ||
    value[labelStartOffset] !== '['
  ) {
    return null
  }

  const labelEndOffset = getResourceLabelEndOffset(value, labelStartOffset)

  if (labelEndOffset === null) {
    return null
  }

  const linkEndOffset = value.indexOf(')', labelEndOffset + 2)

  if (linkEndOffset === -1 || linkEndOffset >= lineEndOffset) {
    return null
  }

  return createMarkdownResourceContext(
    value,
    resourceStartOffset,
    labelStartOffset,
    labelEndOffset,
    linkEndOffset + 1,
  )
}

function getContainingMarkdownResourceContext(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  kind: MarkdownInlineResourceKind,
): MarkdownLinkContext | null {
  const { endOffset, startOffset } = selection

  if (startOffset >= endOffset) {
    return null
  }

  const lineStartOffset = value.lastIndexOf('\n', startOffset - 1) + 1
  const nextLineBreakOffset = value.indexOf('\n', endOffset)
  const lineEndOffset =
    nextLineBreakOffset === -1 ? value.length : nextLineBreakOffset
  const openText = getResourceOpenText(kind)
  let searchOffset = lineStartOffset

  while (searchOffset < lineEndOffset) {
    const resourceStartOffset = value.indexOf(openText, searchOffset)

    if (resourceStartOffset === -1 || resourceStartOffset >= lineEndOffset) {
      break
    }

    const labelStartOffset = getResourceLabelStartOffset(
      resourceStartOffset,
      kind,
    )
    const resourceContext = getMarkdownResourceContextFromLabelStart(
      value,
      labelStartOffset,
      kind,
    )

    if (
      resourceContext &&
      resourceContext.startOffset <= startOffset &&
      endOffset <= resourceContext.endOffset
    ) {
      return resourceContext
    }

    searchOffset = labelStartOffset + 1
  }

  return null
}

function getExactMarkdownResourceContext(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  kind: MarkdownInlineResourceKind,
): MarkdownLinkContext | null {
  const { endOffset, startOffset } = selection
  const openText = getResourceOpenText(kind)

  if (value.startsWith(openText, startOffset)) {
    const fullResourceContext = getMarkdownResourceContextFromLabelStart(
      value,
      getResourceLabelStartOffset(startOffset, kind),
      kind,
    )

    if (
      fullResourceContext &&
      fullResourceContext.startOffset === startOffset &&
      fullResourceContext.endOffset === endOffset
    ) {
      return fullResourceContext
    }
  }

  const labelStartOffset = value.lastIndexOf('[', startOffset)
  const resourceContext =
    labelStartOffset === -1
      ? null
      : getMarkdownResourceContextFromLabelStart(
          value,
          labelStartOffset,
          kind,
        )

  if (
    resourceContext === null ||
    labelStartOffset >= startOffset ||
    getResourceLabelStartOffset(resourceContext.startOffset, kind) !==
      labelStartOffset
  ) {
    return null
  }

  const labelEndOffset = labelStartOffset + 1 + resourceContext.label.length

  if (labelEndOffset < endOffset) {
    return null
  }

  const previousCloseOffset = value.lastIndexOf(')', startOffset)
  const previousOpenOffset = value.lastIndexOf('[', startOffset - 1)

  if (
    previousCloseOffset > resourceContext.startOffset ||
    previousOpenOffset > labelStartOffset
  ) {
    return null
  }

  return resourceContext
}

function getCrossedMarkdownResourceContext(
  value: string,
  normalizedSelection: NormalizedInlineSelectionRange,
  kind: MarkdownInlineResourceKind,
): MarkdownLinkContext | null {
  const { coreRange, leadingWhitespace, trailingWhitespace } =
    normalizedSelection
  const { endOffset, startOffset } = coreRange

  if (trailingWhitespace.length > 0 && startOffset > 0) {
    const labelStartOffset = startOffset - 1
    const resourceContext = getMarkdownResourceContextFromLabelStart(
      value,
      labelStartOffset,
      kind,
    )
    const labelEndOffset = resourceContext
      ? labelStartOffset + 1 + resourceContext.label.length
      : -1

    if (
      resourceContext &&
      getResourceLabelStartOffset(resourceContext.startOffset, kind) ===
        labelStartOffset &&
      labelEndOffset > startOffset &&
      labelEndOffset < endOffset &&
      resourceContext.endOffset === endOffset
    ) {
      return resourceContext
    }
  }

  if (
    leadingWhitespace.length > 0 &&
    value.startsWith(getResourceOpenText(kind), startOffset)
  ) {
    const labelStartOffset = getResourceLabelStartOffset(startOffset, kind)
    const resourceContext = getMarkdownResourceContextFromLabelStart(
      value,
      labelStartOffset,
      kind,
    )
    const labelEndOffset = resourceContext
      ? labelStartOffset + 1 + resourceContext.label.length
      : -1

    if (
      resourceContext &&
      labelEndOffset > labelStartOffset + 1 &&
      labelEndOffset === endOffset
    ) {
      return resourceContext
    }
  }

  return null
}

function getMarkdownResourceContextForNormalizedSelection(
  value: string,
  normalizedSelection: NormalizedInlineSelectionRange,
  kind: MarkdownInlineResourceKind,
): MarkdownLinkContext | null {
  return (
    getExactMarkdownResourceContext(value, normalizedSelection.coreRange, kind) ??
    getContainingMarkdownResourceContext(
      value,
      normalizedSelection.coreRange,
      kind,
    ) ??
    getCrossedMarkdownResourceContext(value, normalizedSelection, kind)
  )
}

export function getLinkEditState(
  value: string,
  selection: MarkdownSelectionOffsetRange,
): MarkdownLinkContext {
  const normalizedSelection = normalizeInlineSelectionRange(value, selection)
  const linkContext = getMarkdownResourceContextForNormalizedSelection(
    value,
    normalizedSelection,
    'link',
  )

  if (linkContext) {
    return linkContext
  }

  const { coreRange, coreText } = normalizedSelection

  return {
    ...coreRange,
    label: coreText,
    sourceText: coreText,
    url: '',
  }
}

export function getImageEditState(
  value: string,
  selection: MarkdownSelectionOffsetRange,
): MarkdownImageContext {
  const normalizedSelection = normalizeInlineSelectionRange(value, selection)
  const imageContext = getMarkdownResourceContextForNormalizedSelection(
    value,
    normalizedSelection,
    'image',
  )

  if (imageContext) {
    return imageContext
  }

  const { coreRange, coreText } = normalizedSelection

  return {
    ...coreRange,
    label: coreText,
    sourceText: coreText,
    url: '',
  }
}

export function createMarkdownLinkText(label: string, url: string) {
  return `[${label}](${url})`
}

export function createMarkdownImageText(label: string, url: string) {
  return `![${label}](${url})`
}

export function getToggleLinkEdits(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  selectedText: string,
) {
  const normalizedSelection = normalizeInlineSelectionRange(
    value,
    selection,
    selectedText,
  )
  const linkContext = getMarkdownResourceContextForNormalizedSelection(
    value,
    normalizedSelection,
    'link',
  )

  if (linkContext) {
    const labelStartOffset = linkContext.startOffset + 1
    const labelEndOffset = labelStartOffset + linkContext.label.length

    return {
      edits: [
        {
          endOffset: linkContext.endOffset,
          startOffset: labelEndOffset,
          text: '',
        },
        {
          endOffset: labelStartOffset,
          startOffset: linkContext.startOffset,
          text: '',
        },
      ] satisfies MarkdownTextEdit[],
      nextSelection: {
        endOffset: linkContext.startOffset + linkContext.label.length,
        startOffset: linkContext.startOffset,
      },
    }
  }

  const { endOffset, startOffset } = normalizedSelection.coreRange

  return {
    edits: [
      { endOffset, startOffset: endOffset, text: ']()' },
      { endOffset: startOffset, startOffset, text: '[' },
    ] satisfies MarkdownTextEdit[],
    nextSelection: {
      endOffset: endOffset + 3,
      startOffset: endOffset + 3,
    },
  }
}

export function getToggleImageEdits(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  selectedText: string,
) {
  const normalizedSelection = normalizeInlineSelectionRange(
    value,
    selection,
    selectedText,
  )
  const imageContext = getMarkdownResourceContextForNormalizedSelection(
    value,
    normalizedSelection,
    'image',
  )

  if (imageContext) {
    const labelStartOffset = imageContext.startOffset + 2
    const labelEndOffset = labelStartOffset + imageContext.label.length

    return {
      edits: [
        {
          endOffset: imageContext.endOffset,
          startOffset: labelEndOffset,
          text: '',
        },
        {
          endOffset: labelStartOffset,
          startOffset: imageContext.startOffset,
          text: '',
        },
      ] satisfies MarkdownTextEdit[],
      nextSelection: {
        endOffset: imageContext.startOffset + imageContext.label.length,
        startOffset: imageContext.startOffset,
      },
    }
  }

  const { endOffset, startOffset } = normalizedSelection.coreRange

  return {
    edits: [
      { endOffset, startOffset: endOffset, text: ']()' },
      { endOffset: startOffset, startOffset, text: '![' },
    ] satisfies MarkdownTextEdit[],
    nextSelection: {
      endOffset: endOffset + 4,
      startOffset: endOffset + 4,
    },
  }
}

export function isLinkSelectionActive(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  selectedText: string,
) {
  return (
    getMarkdownResourceContextForNormalizedSelection(
      value,
      normalizeInlineSelectionRange(value, selection, selectedText),
      'link',
    ) !== null
  )
}

export function isImageSelectionActive(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  selectedText: string,
) {
  return (
    getMarkdownResourceContextForNormalizedSelection(
      value,
      normalizeInlineSelectionRange(value, selection, selectedText),
      'image',
    ) !== null
  )
}
