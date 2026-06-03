import {
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import { MarkdownHooks } from 'react-markdown'
import rehypePrettyCode, {
  type Options as RehypePrettyCodeOptions,
} from 'rehype-pretty-code'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import type { PluggableList } from 'unified'
import { postOpenExternalUrl } from '../../app/webview/draftWebViewMessages'
import {
  isCalloutType,
  type CalloutType,
} from '../../markdown/callouts'
import type { DraftPreviewTheme } from '../../themes/preview/support/previewThemeTypes'
import {
  getOrderedListMarkerStyle,
  getUnorderedListMarkerStyle,
} from '../../themes/preview/support/previewThemeStyles'
import { rehypeDraftMarkdownExtensions } from '../markdownExtensions/draftMarkdownExtensionsPlugin'
import { rehypeSourceTextSpans } from '../sourceMapping/sourceTextSpansPlugin'
import type { SourceMappedNode } from '../previewTypes'

type PreviewMarkdownRendererProps = {
  markdown: string
  previewTheme: DraftPreviewTheme
}

type PreviewCodeBlockProps = ComponentPropsWithoutRef<'pre'> & {
  sourceLine?: number
}
type PreviewBlockquoteProps = ComponentPropsWithoutRef<'blockquote'> & {
  sourceLine?: number
}

type ListCssProperties = CSSProperties & Record<`--${string}`, string>
type PreviewTagCssProperties = CSSProperties & {
  '--preview-current-tag-color'?: string
}
type PreviewTagProps = ComponentPropsWithoutRef<'span'> & {
  tagColor?: string
}
type PreviewSpoilerProps = ComponentPropsWithoutRef<'span'> & {
  spoilerId?: string
}

type PreviewListProps<TagName extends 'ol' | 'ul'> =
  ComponentPropsWithoutRef<TagName> & {
    sourceLine?: number
  }

const COPY_FEEDBACK_MS = 1000
const PRETTY_CODE_FALLBACK_THEME = 'github-dark'
const supportedExternalLinkProtocols = new Set(['http:', 'https:', 'mailto:'])
const remarkPlugins: PluggableList = [remarkGfm]
const ListDepthContext = createContext(0)
const PreviewThemeContext = createContext<DraftPreviewTheme | null>(null)
const revealedSpoilerIds = new Set<string>()
const previewCalloutIconPaths = {
  default: 'icons/Blockquote.svg',
  note: 'icons/callouts/Note.svg',
  info: 'icons/callouts/Info.svg',
  tip: 'icons/callouts/Tip.svg',
  important: 'icons/callouts/Important.svg',
  warning: 'icons/callouts/Warning.svg',
  caution: 'icons/callouts/Caution.svg',
  error: 'icons/callouts/Error.svg',
  success: 'icons/callouts/Success.svg',
  question: 'icons/callouts/Question.svg',
  todo: 'icons/callouts/Todo.svg',
} satisfies Record<CalloutType, string>
const blockquoteIconPositions = [
  'top-left',
  'left',
  'bottom-left',
  'bottom',
  'bottom-right',
  'right',
  'top-right',
  'top',
] as const
const blockquoteIconPositionSet = new Set<string>(blockquoteIconPositions)

function getSourceLine(node: SourceMappedNode | undefined) {
  const line = node?.position?.start?.line
  return typeof line === 'number' && Number.isFinite(line) ? line : undefined
}

function getTextFromReactNode(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }

  if (Array.isArray(node)) {
    return node.map(getTextFromReactNode).join('')
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getTextFromReactNode(node.props.children)
  }

  return ''
}

function hasClassName(className: string | undefined, targetClassName: string) {
  return className?.split(/\s+/u).includes(targetClassName) ?? false
}

function getStringAttribute(
  props: Record<string, unknown>,
  attributeName: string,
) {
  const value = props[attributeName]

  return typeof value === 'string' ? value : undefined
}

function getSpanHtmlProps(props: Record<string, unknown>) {
  const spanProps = { ...props }

  delete spanProps.node

  return spanProps as ComponentPropsWithoutRef<'span'> &
    Record<string, unknown>
}

function getPreviewAssetUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path}`
}

function getCalloutTypeAttribute(props: Record<string, unknown>) {
  const calloutType = getStringAttribute(props, 'data-callout-type')

  return calloutType && isCalloutType(calloutType) ? calloutType : null
}

function getBlockquoteIconPosition(previewTheme: DraftPreviewTheme | null) {
  const position =
    previewTheme?.cssVariables['--preview-blockquote-icon-position']

  return position && blockquoteIconPositionSet.has(position)
    ? position
    : 'left'
}

function getBlockquoteBoldUsesCalloutColor(
  previewTheme: DraftPreviewTheme | null,
) {
  const value =
    previewTheme?.cssVariables['--preview-blockquote-bold-uses-callout-color']
      ?.trim()
      .toLowerCase()

  if (value === 'false' || value === '0') {
    return 'false'
  }

  return 'true'
}

function copyTextWithTextarea(text: string) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '0'
  textarea.style.width = '1px'
  textarea.style.height = '1px'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'

  document.body.append(textarea)
  textarea.focus({ preventScroll: true })
  textarea.select()

  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea.remove()
  }
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fall back for WebView/file contexts where async clipboard is blocked.
    }
  }

  return copyTextWithTextarea(text)
}

function getNormalizedExternalHref(href: string | undefined) {
  const trimmedHref = href?.trim()

  if (!trimmedHref || trimmedHref.startsWith('#')) {
    return null
  }

  try {
    const url = new URL(trimmedHref)

    return supportedExternalLinkProtocols.has(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

function openExternalHref(href: string) {
  postOpenExternalUrl(href)

  if (window.chrome?.webview) {
    return
  }

  window.open(href, '_blank', 'noopener,noreferrer')
}

function selectPreviewElement(element: HTMLElement) {
  const selection = window.getSelection()

  if (!selection) {
    return
  }

  const range = document.createRange()
  range.selectNode(element)
  selection.removeAllRanges()
  selection.addRange(range)
}

function getRehypePlugins(previewTheme: DraftPreviewTheme): PluggableList {
  const plugins: PluggableList = [rehypeRaw]

  if (previewTheme.usePrettyCode) {
    const prettyCodeOptions: RehypePrettyCodeOptions = {
      bypassInlineCode: true,
      grid: true,
      keepBackground: false,
      theme: previewTheme.prettyCodeTheme ?? PRETTY_CODE_FALLBACK_THEME,
    }

    plugins.push([rehypePrettyCode, prettyCodeOptions])
  }

  plugins.push(rehypeDraftMarkdownExtensions)
  plugins.push(rehypeSourceTextSpans)

  return plugins
}

function PreviewTag({
  style,
  tagColor,
  ...props
}: PreviewTagProps) {
  const tagStyle = tagColor
    ? ({
        ...style,
        '--preview-current-tag-color': tagColor,
      } satisfies PreviewTagCssProperties)
    : style

  return <span {...props} style={tagStyle} />
}

function PreviewSpoiler({
  children,
  className,
  onClick,
  onKeyDown,
  spoilerId,
  ...props
}: PreviewSpoilerProps) {
  const [isLocallyRevealed, setIsLocallyRevealed] = useState(false)
  const isRevealed = spoilerId
    ? revealedSpoilerIds.has(spoilerId)
    : isLocallyRevealed

  function toggleSpoiler() {
    if (spoilerId) {
      if (isRevealed) {
        revealedSpoilerIds.delete(spoilerId)
      } else {
        revealedSpoilerIds.add(spoilerId)
      }
    } else {
      setIsLocallyRevealed((currentValue) => !currentValue)
      return
    }

    setIsLocallyRevealed((currentValue) => !currentValue)
  }

  return (
    <span
      {...props}
      className={`${className ?? ''}${isRevealed ? ' is-revealed' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={
        isRevealed
          ? 'Spoiler visible. Click to hide.'
          : 'Spoiler hidden. Click to reveal.'
      }
      onClick={(event) => {
        onClick?.(event)

        if (!event.defaultPrevented) {
          toggleSpoiler()
        }
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)

        if (
          event.defaultPrevented ||
          (event.key !== 'Enter' && event.key !== ' ')
        ) {
          return
        }

        event.preventDefault()
        toggleSpoiler()
      }}
    >
      <span className="preview-spoiler-content" aria-hidden={!isRevealed}>
        {children}
      </span>
    </span>
  )
}

function PreviewCodeBlock({
  children,
  sourceLine,
  ...props
}: PreviewCodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const resetCopiedTimeoutRef = useRef(0)
  const codeText = getTextFromReactNode(children)

  useEffect(() => {
    return () => {
      if (resetCopiedTimeoutRef.current !== 0) {
        window.clearTimeout(resetCopiedTimeoutRef.current)
      }
    }
  }, [])

  async function handleCopyClick(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()

    const didCopy = await copyTextToClipboard(codeText)

    if (!didCopy) {
      return
    }

    setCopied(true)

    if (resetCopiedTimeoutRef.current !== 0) {
      window.clearTimeout(resetCopiedTimeoutRef.current)
    }

    resetCopiedTimeoutRef.current = window.setTimeout(() => {
      setCopied(false)
      resetCopiedTimeoutRef.current = 0
    }, COPY_FEEDBACK_MS)
  }

  return (
    <div className="preview-code-block" data-source-line={sourceLine}>
      <pre {...props}>{children}</pre>
      <button
        type="button"
        className={`preview-code-block-copy-button${copied ? ' is-copied' : ''}`}
        aria-label={copied ? 'Copied code block' : 'Copy code block'}
        title={copied ? 'Copied' : 'Copy'}
        onClick={handleCopyClick}
        onMouseDown={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
      >
        <svg
          className="preview-code-block-copy-icon"
          viewBox="0 0 48 48"
          aria-hidden="true"
        >
          <path d="M20.4053 37.5C15.2484 37.5 12.5 34.7514 12.5 29.5943V17.8774C12.5 16.4328 13.2867 15.1757 14.4526 14.5V29.5943C14.4526 33.6729 16.3269 35.5472 20.4053 35.5472H31.5C30.8245 36.7137 29.5658 37.5 28.121 37.5L20.4053 37.5Z" />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M20.3 33.5C18.2013 33.5 16.5 31.7987 16.5 29.7V14.3C16.5 12.2013 18.2013 10.5 20.3 10.5H31.7C33.7987 10.5 35.5 12.2013 35.5 14.3V29.7C35.5 31.7987 33.7987 33.5 31.7 33.5H20.3ZM31.7 31.6C32.7493 31.6 33.6 30.7493 33.6 29.7V14.3C33.6 13.2507 32.7493 12.4 31.7 12.4H20.3C19.2507 12.4 18.4 13.2507 18.4 14.3V29.7C18.4 30.7493 19.2507 31.6 20.3 31.6H31.7Z"
          />
        </svg>
        <svg
          className="preview-code-block-check-icon"
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <path d="M3.6 8.4 6.7 11.4 12.6 4.8" />
        </svg>
      </button>
    </div>
  )
}

function PreviewBlockquote({
  children,
  className,
  sourceLine,
  ...props
}: PreviewBlockquoteProps) {
  const previewTheme = useContext(PreviewThemeContext)
  const calloutType = getCalloutTypeAttribute(props)

  if (!calloutType) {
    return (
      <blockquote
        {...props}
        className={className}
        data-source-line={sourceLine}
      >
        {children}
      </blockquote>
    )
  }

  const iconUrl = getPreviewAssetUrl(previewCalloutIconPaths[calloutType])

  return (
    <blockquote
      {...props}
      className={className}
      data-callout-bold-color={getBlockquoteBoldUsesCalloutColor(previewTheme)}
      data-callout-icon-position={getBlockquoteIconPosition(previewTheme)}
      data-source-line={sourceLine}
    >
      <span
        className="preview-callout-icon"
        aria-hidden="true"
        style={{
          WebkitMaskImage: `url("${iconUrl}")`,
          maskImage: `url("${iconUrl}")`,
        }}
      />
      <div className="preview-callout-body">{children}</div>
    </blockquote>
  )
}

function getOrderedListStyle(
  previewTheme: DraftPreviewTheme | null,
  depth: number,
  style: CSSProperties | undefined,
) {
  if (!previewTheme) {
    return style
  }

  const markerStyle = getOrderedListMarkerStyle(previewTheme, depth)

  return {
    ...style,
    '--preview-current-ordered-list-marker-color': markerStyle.color,
    '--preview-current-ordered-list-marker-font-weight':
      markerStyle.fontWeight,
    '--preview-current-ordered-list-marker-numbering':
      markerStyle.numbering,
    '--preview-current-ordered-list-marker-size': markerStyle.size,
    '--preview-current-ordered-list-marker-spacing': markerStyle.spacing,
    listStyleType: markerStyle.numbering,
  } satisfies ListCssProperties
}

function getUnorderedListStyle(
  previewTheme: DraftPreviewTheme | null,
  depth: number,
  style: CSSProperties | undefined,
) {
  if (!previewTheme) {
    return style
  }

  const markerStyle = getUnorderedListMarkerStyle(previewTheme, depth)

  return {
    ...style,
    '--preview-current-unordered-list-marker-color': markerStyle.color,
    '--preview-current-unordered-list-marker-shape': markerStyle.shape,
    '--preview-current-unordered-list-marker-size': markerStyle.size,
    '--preview-current-unordered-list-marker-spacing': markerStyle.spacing,
    listStyleType: markerStyle.shape,
  } satisfies ListCssProperties
}

function PreviewOrderedList({
  children,
  sourceLine,
  style,
  ...props
}: PreviewListProps<'ol'>) {
  const depth = useContext(ListDepthContext)
  const previewTheme = useContext(PreviewThemeContext)
  const listStyle = getOrderedListStyle(previewTheme, depth, style)

  return (
    <ListDepthContext.Provider value={depth + 1}>
      <ol
        {...props}
        data-list-depth={depth}
        data-source-line={sourceLine}
        style={listStyle}
      >
        {children}
      </ol>
    </ListDepthContext.Provider>
  )
}

function PreviewUnorderedList({
  children,
  sourceLine,
  style,
  ...props
}: PreviewListProps<'ul'>) {
  const depth = useContext(ListDepthContext)
  const previewTheme = useContext(PreviewThemeContext)
  const listStyle = getUnorderedListStyle(previewTheme, depth, style)

  return (
    <ListDepthContext.Provider value={depth + 1}>
      <ul
        {...props}
        data-list-depth={depth}
        data-source-line={sourceLine}
        style={listStyle}
      >
        {children}
      </ul>
    </ListDepthContext.Provider>
  )
}

const previewComponents: Components = {
  h1({ node, ...props }) {
    return <h1 {...props} data-source-line={getSourceLine(node)} />
  },
  h2({ node, ...props }) {
    return <h2 {...props} data-source-line={getSourceLine(node)} />
  },
  h3({ node, ...props }) {
    return <h3 {...props} data-source-line={getSourceLine(node)} />
  },
  h4({ node, ...props }) {
    return <h4 {...props} data-source-line={getSourceLine(node)} />
  },
  h5({ node, ...props }) {
    return <h5 {...props} data-source-line={getSourceLine(node)} />
  },
  h6({ node, ...props }) {
    return <h6 {...props} data-source-line={getSourceLine(node)} />
  },
  p({ node, ...props }) {
    return <p {...props} data-source-line={getSourceLine(node)} />
  },
  li({ node, ...props }) {
    return <li {...props} data-source-line={getSourceLine(node)} />
  },
  ol({ node, ...props }) {
    return <PreviewOrderedList {...props} sourceLine={getSourceLine(node)} />
  },
  ul({ node, ...props }) {
    return <PreviewUnorderedList {...props} sourceLine={getSourceLine(node)} />
  },
  blockquote({ node, ...props }) {
    return <PreviewBlockquote {...props} sourceLine={getSourceLine(node)} />
  },
  a({ node, href, onClick, ...props }) {
    const normalizedHref = getNormalizedExternalHref(href)

    return (
      <a
        {...props}
        href={href}
        data-source-line={getSourceLine(node)}
        onClick={(event) => {
          onClick?.(event)

          if (event.defaultPrevented) {
            return
          }

          if (!normalizedHref) {
            if (!href?.startsWith('#')) {
              event.preventDefault()
            }

            return
          }

          event.preventDefault()
          openExternalHref(normalizedHref)
        }}
      />
    )
  },
  img({ node, onClick, ...props }) {
    return (
      <img
        {...props}
        data-source-line={getSourceLine(node)}
        onClick={(event) => {
          onClick?.(event)

          if (event.defaultPrevented) {
            return
          }

          event.preventDefault()
          event.stopPropagation()
          selectPreviewElement(event.currentTarget)
        }}
      />
    )
  },
  pre({ node, children, ...props }) {
    return (
      <PreviewCodeBlock {...props} sourceLine={getSourceLine(node)}>
        {children}
      </PreviewCodeBlock>
    )
  },
  table({ node, ...props }) {
    return <table {...props} data-source-line={getSourceLine(node)} />
  },
  hr({ node, ...props }) {
    return <hr {...props} data-source-line={getSourceLine(node)} />
  },
  span({ className, children, style, ...props }) {
    const spanProps = getSpanHtmlProps(props)

    if (hasClassName(className, 'preview-spoiler')) {
      return (
        <PreviewSpoiler
          {...spanProps}
          className={className}
          spoilerId={getStringAttribute(spanProps, 'data-spoiler-id')}
        >
          {children}
        </PreviewSpoiler>
      )
    }

    if (
      hasClassName(className, 'preview-tag') ||
      hasClassName(className, 'preview-badge')
    ) {
      return (
        <PreviewTag
          {...spanProps}
          className={className}
          tagColor={
            getStringAttribute(spanProps, 'data-tag-color') ??
            getStringAttribute(spanProps, 'data-badge-color')
          }
          style={style}
        >
          {children}
        </PreviewTag>
      )
    }

    return (
      <span {...spanProps} className={className} style={style}>
        {children}
      </span>
    )
  },
}

function PreviewMarkdownRenderer({
  markdown,
  previewTheme,
}: PreviewMarkdownRendererProps) {
  const rehypePlugins = useMemo(
    () => getRehypePlugins(previewTheme),
    [previewTheme],
  )

  return (
    <PreviewThemeContext.Provider value={previewTheme}>
      <MarkdownHooks
        components={previewComponents}
        rehypePlugins={rehypePlugins}
        remarkPlugins={remarkPlugins}
      >
        {markdown}
      </MarkdownHooks>
    </PreviewThemeContext.Provider>
  )
}

export default PreviewMarkdownRenderer
