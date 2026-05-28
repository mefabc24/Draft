import type { CSSProperties } from 'react'
import type {
  DraftPreviewTheme,
  OrderedListMarkerStyle,
  UnorderedListMarkerStyle,
} from './previewThemeTypes'

export type NormalizedOrderedListMarkerStyle = {
  color: string
  fontWeight: string
  numbering: string
  size: string
  spacing: string
}

export type NormalizedUnorderedListMarkerStyle = {
  color: string
  shape: string
  size: string
  spacing: string
}

const defaultOrderedListMarkerStyle: NormalizedOrderedListMarkerStyle = {
  color: 'currentColor',
  fontWeight: '400',
  numbering: 'decimal',
  size: '1em',
  spacing: '0',
}

const defaultUnorderedListMarkerStyle: NormalizedUnorderedListMarkerStyle = {
  color: 'currentColor',
  shape: 'disc',
  size: '1em',
  spacing: '0',
}

function normalizeOrderedListNumbering(numbering: string) {
  switch (numbering) {
    case 'alphabetical':
      return 'lower-alpha'
    case 'roman':
      return 'lower-roman'
    case 'upperAlphabetical':
      return 'upper-alpha'
    case 'upperRoman':
      return 'upper-roman'
    default:
      return numbering
  }
}

function normalizeOrderedListMarkerStyle(
  markerStyle: OrderedListMarkerStyle | undefined,
): NormalizedOrderedListMarkerStyle {
  if (!markerStyle) {
    return defaultOrderedListMarkerStyle
  }

  if (typeof markerStyle === 'string') {
    return {
      ...defaultOrderedListMarkerStyle,
      numbering: normalizeOrderedListNumbering(markerStyle),
    }
  }

  return {
    ...defaultOrderedListMarkerStyle,
    ...markerStyle,
    numbering: normalizeOrderedListNumbering(markerStyle.numbering),
  }
}

function normalizeUnorderedListMarkerStyle(
  markerStyle: UnorderedListMarkerStyle | undefined,
): NormalizedUnorderedListMarkerStyle {
  if (!markerStyle) {
    return defaultUnorderedListMarkerStyle
  }

  if (typeof markerStyle === 'string') {
    return {
      ...defaultUnorderedListMarkerStyle,
      shape: markerStyle,
    }
  }

  return {
    ...defaultUnorderedListMarkerStyle,
    ...markerStyle,
  }
}

function getListMarkerStyleIndex(
  stylesLength: number,
  depth: number,
  loopCount: number,
) {
  if (stylesLength <= 0) {
    return 0
  }

  const normalizedLoopCount = Number.isFinite(loopCount)
    ? Math.max(Math.trunc(loopCount), 0)
    : 0

  if (normalizedLoopCount > 0) {
    const repeatedDepthCount = stylesLength * (normalizedLoopCount + 1)

    if (depth < repeatedDepthCount) {
      return depth % stylesLength
    }
  }

  return Math.min(depth, stylesLength - 1)
}

export function getOrderedListMarkerStyle(
  theme: DraftPreviewTheme,
  depth: number,
) {
  const styles = theme.orderedListMarkerStyles

  if (styles.length === 0) {
    return defaultOrderedListMarkerStyle
  }

  return normalizeOrderedListMarkerStyle(
    styles[
      getListMarkerStyleIndex(
        styles.length,
        depth,
        theme.orderedListMarkerLoopCount,
      )
    ],
  )
}

export function getUnorderedListMarkerStyle(
  theme: DraftPreviewTheme,
  depth: number,
) {
  const styles = theme.unorderedListMarkerStyles

  if (styles.length === 0) {
    return defaultUnorderedListMarkerStyle
  }

  return normalizeUnorderedListMarkerStyle(
    styles[
      getListMarkerStyleIndex(
        styles.length,
        depth,
        theme.unorderedListMarkerLoopCount,
      )
    ],
  )
}

export function getPreviewThemeStyle(theme: DraftPreviewTheme) {
  return {
    ...theme.cssVariables,
    '--preview-table-width': theme.stretchTablesToFullWidth
      ? '100%'
      : 'max-content',
    '--preview-table-max-width': '100%',
  } as CSSProperties
}
