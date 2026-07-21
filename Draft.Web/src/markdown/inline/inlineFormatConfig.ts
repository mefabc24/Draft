import type {
  InlineFormatMarkerPair,
  ParsedInlineFormat,
  WrappableInlineFormat,
} from './inlineFormatTypes'

export type InlineFormatConfig = InlineFormatMarkerPair & {
  mergeAdjacent: boolean
  parseInsideInlineCode: boolean
}

export const inlineFormatConfig = {
  badge: {
    closingMarker: ']',
    mergeAdjacent: false,
    openingMarker: '[badge:',
    parseInsideInlineCode: false,
  },
  bold: {
    closingMarker: '**',
    mergeAdjacent: true,
    openingMarker: '**',
    parseInsideInlineCode: false,
  },
  italic: {
    closingMarker: '*',
    mergeAdjacent: true,
    openingMarker: '*',
    parseInsideInlineCode: false,
  },
  strike: {
    closingMarker: '~~',
    mergeAdjacent: true,
    openingMarker: '~~',
    parseInsideInlineCode: false,
  },
  underline: {
    closingMarker: '</u>',
    mergeAdjacent: true,
    openingMarker: '<u>',
    parseInsideInlineCode: false,
  },
  inlineCode: {
    closingMarker: '`',
    mergeAdjacent: false,
    openingMarker: '`',
    parseInsideInlineCode: false,
  },
  spoiler: {
    closingMarker: '||',
    mergeAdjacent: false,
    openingMarker: '||',
    parseInsideInlineCode: false,
  },
  highlight: {
    closingMarker: '==',
    mergeAdjacent: true,
    openingMarker: '==',
    parseInsideInlineCode: false,
  },
  comment: {
    closingMarker: ' -->',
    mergeAdjacent: true,
    openingMarker: '<!-- ',
    parseInsideInlineCode: false,
  },
} satisfies Record<WrappableInlineFormat, InlineFormatConfig>

export const wrappableInlineFormats = Object.keys(
  inlineFormatConfig,
) as WrappableInlineFormat[]

export function getWrappableInlineFormatForMarkers(
  openingMarker: string,
  closingMarker = openingMarker,
): WrappableInlineFormat | null {
  return (
    wrappableInlineFormats.find((format) => {
      const config = inlineFormatConfig[format]

      return (
        config.openingMarker === openingMarker &&
        config.closingMarker === closingMarker
      )
    }) ?? null
  )
}

export function getInlineFormatMarkers(
  format: WrappableInlineFormat,
): InlineFormatMarkerPair {
  const config = inlineFormatConfig[format]

  return {
    closingMarker: config.closingMarker,
    openingMarker: config.openingMarker,
  }
}

export function isParsedInlineFormat(
  value: string,
): value is ParsedInlineFormat {
  return (
    value === 'badge' ||
    value === 'bold' ||
    value === 'comment' ||
    value === 'highlight' ||
    value === 'image' ||
    value === 'inlineCode' ||
    value === 'italic' ||
    value === 'link' ||
    value === 'spoiler' ||
    value === 'strike' ||
    value === 'underline'
  )
}
