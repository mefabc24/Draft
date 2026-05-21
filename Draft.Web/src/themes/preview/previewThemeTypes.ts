import type { CssVariableMap } from '../shared/themeTypes'
import type { Theme as RehypePrettyCodeTheme } from 'rehype-pretty-code'

export type PreviewThemeId = string

/**
 * Unordered-list marker configuration.
 * A string is shorthand for `{ shape: value }`.
 */
export type UnorderedListMarkerStyle =
  | string
  | {
      /** Marker shape: disc, circle, square, none, or any CSS list-style-type. */
      shape: string
      /** Marker-only color: hex, rgb(), hsl(), currentColor, or any CSS color. */
      color?: string
      /** Space between marker and text: CSS length, e.g. 0, 4px, 0.35em. */
      spacing?: string
      /** Marker size: CSS length, e.g. 1em, 0.9em, 14px. */
      size?: string
    }

/**
 * Ordered-list marker configuration.
 * A string is shorthand for `{ numbering: value }`.
 */
export type OrderedListMarkerStyle =
  | string
  | {
      /** Marker numbering: decimal, roman, upperRoman, alphabetical, upperAlphabetical, none, or any CSS list-style-type. */
      numbering: string
      /** Marker-only color: hex, rgb(), hsl(), currentColor, or any CSS color. */
      color?: string
      /** Marker-only font-weight: normal, bold, or 100..900. */
      fontWeight?: string
      /** Space between marker and text: CSS length, e.g. 0, 4px, 0.35em. */
      spacing?: string
      /** Marker size: CSS length, e.g. 1em, 0.9em, 14px. */
      size?: string
    }

export type DraftPreviewTheme = {
  cssVariables: CssVariableMap
  id: PreviewThemeId
  label: string
  /**
   * true: fenced code blocks receive Shiki token colors through rehype-pretty-code.
   * false: code blocks use the theme's plain code foreground color.
   */
  usePrettyCode: boolean
  /**
   * rehype-pretty-code/Shiki theme used when usePrettyCode is true.
   * Built-in examples: github-dark, github-dark-dimmed, dark-plus, min-dark, one-dark-pro.
   */
  prettyCodeTheme?: RehypePrettyCodeTheme
  /**
   * true: tables stretch across the full preview width.
   * false: tables use their content width and are capped at the preview width.
   */
  stretchTablesToFullWidth: boolean
  /**
   * Ordered-list markers by nesting depth: [level 0, level 1, level 2+].
   * The last value repeats for deeper levels.
   * Set orderedListMarkerLoopCount to repeat the whole array before the
   * last value takes over again.
   */
  orderedListMarkerStyles: OrderedListMarkerStyle[]
  /**
   * 0 disables looping. 1 repeats the full ordered marker array once:
   * [a, b, c] becomes a, b, c, a, b, c, then c for deeper levels.
   */
  orderedListMarkerLoopCount: number
  /**
   * Unordered-list markers by nesting depth: [level 0, level 1, level 2+].
   * The last value repeats for deeper levels.
   * Set unorderedListMarkerLoopCount to repeat the whole array before the
   * last value takes over again.
   */
  unorderedListMarkerStyles: UnorderedListMarkerStyle[]
  /**
   * 0 disables looping. 1 repeats the full unordered marker array once:
   * [circle, square, disc] becomes circle, square, disc, circle, square, disc,
   * then disc for deeper levels.
   */
  unorderedListMarkerLoopCount: number
}
