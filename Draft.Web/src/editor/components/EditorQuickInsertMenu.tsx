import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from 'react'
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import type { CalloutType } from '../../markdown/callouts'
import { useTranslation } from '../../localization/useTranslation'
import {
  eventMatchesShortcutAction,
  eventMatchesShortcutActionKeyboardState,
} from '../../shortcuts/shortcutMatching'
import {
  registerPressedShortcutKeyTracker,
  type PressedShortcutKeyTracker,
} from '../../shortcuts/pressedShortcutKeys'
import {
  shortcutActionIds,
  type ShortcutBindings,
} from '../../shortcuts/shortcutSettings'
import {
  insertEditorQuickInsertCodeBlock,
  insertEditorQuickInsertExpander,
  insertEditorQuickInsertImage,
  insertEditorQuickInsertKeyboard,
  insertEditorQuickInsertLink,
  insertEditorQuickInsertTag,
  insertEditorQuickInsertTable,
  runEditorQuickInsertCommand,
  type EditorQuickInsertCommand,
} from '../commands/editorQuickInsertCommands'
import type { CreateCodeBlockMarkdownData } from '../commands/createCodeBlockMarkdown'
import type {
  CreateExpanderMarkdownData,
  CreateInlineImageMarkdownData,
  CreateInlineLinkMarkdownData,
  CreateInlineTagMarkdownData,
} from '../commands/createInlineLinkMarkdown'
import type { CreateTableMarkdownData } from '../commands/createTableMarkdown'
import type { CreateKeyboardMarkdownData } from '../commands/createKeyboardMarkdown'
import type {
  EditorQuickInsertMenuAnchor,
  EditorQuickInsertMenuPosition,
} from '../hooks/useEditorQuickInsertMenu'
import {
  editorQuickInsertMenuEntries,
  type EditorQuickInsertIconName,
  type EditorQuickInsertMenuEntry,
} from './EditorQuickInsertMenuConfig'
import EditorQuickInsertCodeblockControls from './EditorQuickInsertCodeblockControls'
import EditorQuickInsertExpanderControls from './EditorQuickInsertExpanderControls'
import EditorQuickInsertInlineMediaControls from './EditorQuickInsertInlineMediaControls'
import EditorQuickInsertKeyboardControls from './EditorQuickInsertKeyboardControls'
import EditorQuickInsertMenuItem from './EditorQuickInsertMenuItem'
import EditorQuickInsertMenuSection from './EditorQuickInsertMenuSection'
import EditorQuickInsertScrollArea from './EditorQuickInsertScrollArea'
import EditorQuickInsertTableControls from './EditorQuickInsertTableControls'
import EditorQuickInsertTagControls from './EditorQuickInsertTagControls'
import './EditorQuickInsertMenu.css'

type EditorQuickInsertMenuProps = {
  editor: monaco.editor.IStandaloneCodeEditor | null
  menuRef: RefObject<HTMLDivElement | null>
  onClose: () => void
  onContentLayoutChange: () => void
  onKeepOpenAction: (action: () => number | false | null) => void
  position: EditorQuickInsertMenuPosition | null
  shortcutBindings: ShortcutBindings
  target: EditorQuickInsertMenuAnchor | null
}

type EditorQuickInsertCommandEntry = Extract<
  EditorQuickInsertMenuEntry,
  { type: 'item' }
>
type EditorQuickInsertSectionEntry = Extract<
  EditorQuickInsertMenuEntry,
  { type: 'section' }
>

const QUICK_INSERT_VISIBLE_CALLOUT_COUNT = 5
const quickInsertIconPaths: Record<EditorQuickInsertIconName, string> = {
  blockquote: 'icons/Blockquote2.svg',
  callout: 'icons/Callout.svg',
  codeblock: 'icons/Codeblock2.svg',
  expander: 'icons/Expander.svg',
  heading: 'icons/Headline.svg',
  image: 'icons/Image.svg',
  keyboard: 'icons/Key.svg',
  link: 'icons/Link2.svg',
  list: 'icons/List.svg',
  misc: 'icons/Misc.svg',
  tag: 'icons/Tag.svg',
  table: 'icons/Tables.svg',
}
const quickInsertCalloutIconPaths = {
  default: 'icons/Blockquote.svg',
  note: 'icons/callouts/Note.svg',
  info: 'icons/callouts/Info.svg',
  tip: 'icons/callouts/Tip.svg',
  important: 'icons/callouts/Important.svg',
  warning: 'icons/callouts/Warning.svg',
  caution: 'icons/callouts/Caution.svg',
  error: 'icons/callouts/Error.svg',
  success: 'icons/callouts/Success.svg',
  good: 'icons/callouts/Good.svg',
  bad: 'icons/callouts/Bad.svg',
  pro: 'icons/callouts/Pro.svg',
  con: 'icons/callouts/Contra.svg',
  question: 'icons/callouts/Question.svg',
  todo: 'icons/callouts/Todo.svg',
} satisfies Record<CalloutType, string>

function getQuickInsertAssetUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path}`
}

function getQuickInsertIcon(icon: EditorQuickInsertIconName | undefined) {
  if (!icon) {
    return undefined
  }

  return (
    <span
      aria-hidden="true"
      className="editor-quick-insert-icon-glyph"
      style={{
        WebkitMaskImage:
          `url("${getQuickInsertAssetUrl(quickInsertIconPaths[icon])}")`,
        maskImage:
          `url("${getQuickInsertAssetUrl(quickInsertIconPaths[icon])}")`,
      }}
    />
  )
}

function getQuickInsertCalloutIcon(calloutType: CalloutType | undefined) {
  if (!calloutType) {
    return undefined
  }

  const iconUrl = getQuickInsertAssetUrl(
    quickInsertCalloutIconPaths[calloutType],
  )
  const color =
    calloutType === 'default'
      ? undefined
      : `var(--preview-blockquote-${calloutType}-color, currentColor)`

  return (
    <span
      aria-hidden="true"
      className="editor-quick-insert-icon-glyph editor-quick-insert-callout-icon"
      style={{
        color,
        WebkitMaskImage: `url("${iconUrl}")`,
        maskImage: `url("${iconUrl}")`,
      }}
    />
  )
}

function getQuickInsertEntryIcon(entry: EditorQuickInsertCommandEntry) {
  return (
    getQuickInsertCalloutIcon(entry.calloutType) ??
    getQuickInsertIcon(entry.icon)
  )
}

function QuickInsertCalloutExpandIcon({ expanded }: { expanded: boolean }) {
  return (
    <span
      className={`editor-quick-insert-callout-expand-chevron${
        expanded ? ' is-expanded' : ''
      }`}
      aria-hidden="true"
    >
      <svg focusable="false" viewBox="0 0 16 16">
        <path d="M3.75 6.25 8 10.5l4.25-4.25" />
      </svg>
    </span>
  )
}

function getInitialExpandedSections() {
  return editorQuickInsertMenuEntries.reduce<Record<string, boolean>>(
    (sections, entry) => {
      if (entry.type === 'section') {
        sections[entry.id] = entry.defaultExpanded
      }

      return sections
    },
    {},
  )
}

function isEditableMenuTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    target.closest('input, textarea, select, [contenteditable="true"]') !== null
  )
}

function shouldAdvanceToNextEmptyLine(
  target: EditorQuickInsertMenuAnchor | null,
  keepOpen: boolean,
) {
  return keepOpen && target?.mode === 'replace-line'
}

function canShowQuickInsertEntry(
  entry: EditorQuickInsertMenuEntry,
  target: EditorQuickInsertMenuAnchor | null,
) {
  return target?.mode !== 'insert-at-cursor' || entry.canInsertIntoNonEmptyLine
}

function EditorQuickInsertMenu({
  editor,
  menuRef,
  onClose,
  onContentLayoutChange,
  onKeepOpenAction,
  position,
  shortcutBindings,
  target,
}: EditorQuickInsertMenuProps) {
  const { t } = useTranslation()
  const [expandedSections, setExpandedSections] = useState(
    getInitialExpandedSections,
  )
  const [extraCalloutsExpanded, setExtraCalloutsExpanded] = useState(false)
  const pressedShortcutKeyTrackerRef = useRef<PressedShortcutKeyTracker | null>(
    null,
  )
  const menuStyle = useMemo(
    () =>
      position
        ? ({
            left: `${position.left}px`,
            maxHeight: `${position.maxHeight}px`,
            top: `${position.top}px`,
          }) satisfies CSSProperties
        : undefined,
    [position],
  )
  const menuOpen = editor !== null && target !== null && position !== null

  useEffect(() => {
    const tracker = registerPressedShortcutKeyTracker()
    pressedShortcutKeyTrackerRef.current = tracker

    return () => {
      tracker.dispose()

      if (pressedShortcutKeyTrackerRef.current === tracker) {
        pressedShortcutKeyTrackerRef.current = null
      }
    }
  }, [])

  const shouldKeepQuickInsertOpen = useCallback(
    (event: ReactMouseEvent<HTMLElement>) =>
      event.button === 0 &&
      eventMatchesShortcutActionKeyboardState(
        event,
        shortcutBindings,
        shortcutActionIds.quickInsertKeepOpen,
        pressedShortcutKeyTrackerRef.current?.pressedKeys,
      ),
    [shortcutBindings],
  )

  useLayoutEffect(() => {
    if (!menuOpen) {
      return
    }

    onContentLayoutChange()
  }, [
    expandedSections,
    extraCalloutsExpanded,
    menuOpen,
    onContentLayoutChange,
    target,
  ])

  useEffect(() => {
    if (target === null) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target

      if (
        target instanceof Node &&
        menuRef.current?.contains(target)
      ) {
        return
      }

      onClose()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !eventMatchesShortcutAction(
          event,
          shortcutBindings,
          shortcutActionIds.toolbarClose,
        )
      ) {
        return
      }

      onClose()
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [menuRef, onClose, shortcutBindings, target])

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      onContentLayoutChange()
    })
    const transitionFrameId = window.setTimeout(() => {
      onContentLayoutChange()
    }, 220)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.clearTimeout(transitionFrameId)
    }
  }, [
    expandedSections,
    extraCalloutsExpanded,
    menuOpen,
    onContentLayoutChange,
    target,
  ])

  const runCommand = useCallback(
    (command: EditorQuickInsertCommand, keepOpen = false) => {
      const advanceToNextEmptyLine = shouldAdvanceToNextEmptyLine(
        target,
        keepOpen,
      )
      const runAction = () => {
        if (!editor || target === null) {
          return null
        }

        const result = runEditorQuickInsertCommand(editor, target, command, {
          advanceToNextEmptyLine,
        })

        return result ? result.nextLineNumber : null
      }

      if (advanceToNextEmptyLine) {
        onKeepOpenAction(runAction)
        return
      }

      runAction()
      onClose()
    },
    [editor, onClose, onKeepOpenAction, target],
  )

  const confirmTable = useCallback(
    (tableData: CreateTableMarkdownData, keepOpen = false) => {
      const advanceToNextEmptyLine = shouldAdvanceToNextEmptyLine(
        target,
        keepOpen,
      )
      const runAction = () => {
        if (!editor || target === null) {
          return null
        }

        const result = insertEditorQuickInsertTable(
          editor,
          target,
          tableData,
          {
            advanceToNextEmptyLine,
          },
        )

        return result ? result.nextLineNumber : null
      }

      if (advanceToNextEmptyLine) {
        onKeepOpenAction(runAction)
        return
      }

      runAction()
      onClose()
    },
    [editor, onClose, onKeepOpenAction, target],
  )

  const confirmCodeBlock = useCallback(
    (codeBlockData: CreateCodeBlockMarkdownData, keepOpen = false) => {
      const advanceToNextEmptyLine = shouldAdvanceToNextEmptyLine(
        target,
        keepOpen,
      )
      const runAction = () => {
        if (!editor || target === null) {
          return null
        }

        const result = insertEditorQuickInsertCodeBlock(
          editor,
          target,
          codeBlockData,
          {
            advanceToNextEmptyLine,
          },
        )

        return result ? result.nextLineNumber : null
      }

      if (advanceToNextEmptyLine) {
        onKeepOpenAction(runAction)
        return
      }

      runAction()
      onClose()
    },
    [editor, onClose, onKeepOpenAction, target],
  )

  const confirmImage = useCallback(
    (imageData: CreateInlineImageMarkdownData, keepOpen = false) => {
      const advanceToNextEmptyLine = shouldAdvanceToNextEmptyLine(
        target,
        keepOpen,
      )
      const runAction = () => {
        if (!editor || target === null) {
          return null
        }

        const result = insertEditorQuickInsertImage(
          editor,
          target,
          imageData,
          {
            advanceToNextEmptyLine,
          },
        )

        return result ? result.nextLineNumber : null
      }

      if (advanceToNextEmptyLine) {
        onKeepOpenAction(runAction)
        return
      }

      runAction()
      onClose()
    },
    [editor, onClose, onKeepOpenAction, target],
  )

  const confirmLink = useCallback(
    (linkData: CreateInlineLinkMarkdownData, keepOpen = false) => {
      const advanceToNextEmptyLine = shouldAdvanceToNextEmptyLine(
        target,
        keepOpen,
      )
      const runAction = () => {
        if (!editor || target === null) {
          return null
        }

        const result = insertEditorQuickInsertLink(
          editor,
          target,
          linkData,
          {
            advanceToNextEmptyLine,
          },
        )

        return result ? result.nextLineNumber : null
      }

      if (advanceToNextEmptyLine) {
        onKeepOpenAction(runAction)
        return
      }

      runAction()
      onClose()
    },
    [editor, onClose, onKeepOpenAction, target],
  )

  const confirmTag = useCallback(
    (tagData: CreateInlineTagMarkdownData, keepOpen = false) => {
      const advanceToNextEmptyLine = shouldAdvanceToNextEmptyLine(
        target,
        keepOpen,
      )
      const runAction = () => {
        if (!editor || target === null) {
          return null
        }

        const result = insertEditorQuickInsertTag(
          editor,
          target,
          tagData,
          {
            advanceToNextEmptyLine,
          },
        )

        return result ? result.nextLineNumber : null
      }

      if (advanceToNextEmptyLine) {
        onKeepOpenAction(runAction)
        return
      }

      runAction()
      onClose()
    },
    [editor, onClose, onKeepOpenAction, target],
  )

  const confirmExpander = useCallback(
    (expanderData: CreateExpanderMarkdownData, keepOpen = false) => {
      const advanceToNextEmptyLine = shouldAdvanceToNextEmptyLine(
        target,
        keepOpen,
      )
      const runAction = () => {
        if (!editor || target === null) {
          return null
        }

        const result = insertEditorQuickInsertExpander(
          editor,
          target,
          expanderData,
          {
            advanceToNextEmptyLine,
          },
        )

        return result ? result.nextLineNumber : null
      }

      if (advanceToNextEmptyLine) {
        onKeepOpenAction(runAction)
        return
      }

      runAction()
      onClose()
    },
    [editor, onClose, onKeepOpenAction, target],
  )

  const confirmKeyboard = useCallback(
    (keyboardData: CreateKeyboardMarkdownData, keepOpen = false) => {
      const advanceToNextEmptyLine = shouldAdvanceToNextEmptyLine(
        target,
        keepOpen,
      )
      const runAction = () => {
        if (!editor || target === null) {
          return null
        }

        const result = insertEditorQuickInsertKeyboard(
          editor,
          target,
          keyboardData,
          {
            advanceToNextEmptyLine,
          },
        )

        return result ? result.nextLineNumber : null
      }

      if (advanceToNextEmptyLine) {
        onKeepOpenAction(runAction)
        return
      }

      runAction()
      onClose()
    },
    [editor, onClose, onKeepOpenAction, target],
  )

  const renderCommandItem = useCallback(
    (entry: EditorQuickInsertCommandEntry, nested = false) => {
      const labelKey = entry.calloutType
        ? `callout.${entry.calloutType}`
        : `quickInsert.${entry.id}`

      return (
        <EditorQuickInsertMenuItem
          icon={getQuickInsertEntryIcon(entry)}
          key={entry.id}
          label={t(labelKey, entry.label)}
          nested={nested}
          onSelect={(event) => {
            runCommand(entry.command, shouldKeepQuickInsertOpen(event))
          }}
          shortcut={entry.shortcut}
        />
      )
    },
    [runCommand, shouldKeepQuickInsertOpen, t],
  )

  const renderCalloutSectionChildren = useCallback(
    (entry: EditorQuickInsertSectionEntry) => {
      const visibleChildren = entry.children.filter((childEntry) =>
        canShowQuickInsertEntry(childEntry, target),
      )
      const primaryChildren = visibleChildren.slice(
        0,
        QUICK_INSERT_VISIBLE_CALLOUT_COUNT,
      )
      const extraChildren = visibleChildren.slice(
        QUICK_INSERT_VISIBLE_CALLOUT_COUNT,
      )

      return (
        <>
          {primaryChildren.map((childEntry) =>
            renderCommandItem(childEntry, true),
          )}
          {extraChildren.length > 0 ? (
            <>
              <div
                className={`editor-quick-insert-callout-extra-frame${
                  extraCalloutsExpanded ? ' is-expanded' : ''
                }`}
                aria-hidden={!extraCalloutsExpanded}
                inert={extraCalloutsExpanded ? undefined : true}
              >
                <div className="editor-quick-insert-callout-extra-list">
                  {extraChildren.map((childEntry) =>
                    renderCommandItem(childEntry, true),
                  )}
                </div>
              </div>
              <button
                type="button"
                className="editor-quick-insert-callout-expand-button"
                aria-label={
                  extraCalloutsExpanded
                    ? t('quickInsert.hideExtraCallouts')
                    : t('quickInsert.showExtraCallouts')
                }
                aria-expanded={extraCalloutsExpanded}
                onClick={() => {
                  setExtraCalloutsExpanded((currentExpanded) => !currentExpanded)
                }}
                onMouseDown={(event) => {
                  event.preventDefault()
                }}
              >
                <QuickInsertCalloutExpandIcon
                  expanded={extraCalloutsExpanded}
                />
              </button>
            </>
          ) : null}
        </>
      )
    },
    [extraCalloutsExpanded, renderCommandItem, t, target],
  )

  const renderMenuEntry = useCallback(
    (entry: EditorQuickInsertMenuEntry) => {
      if (!canShowQuickInsertEntry(entry, target)) {
        return null
      }

      if (entry.type === 'item') {
        return renderCommandItem(entry)
      }

      const expanded = expandedSections[entry.id] ?? entry.defaultExpanded

      return (
        <EditorQuickInsertMenuSection
          expanded={expanded}
          icon={getQuickInsertIcon(entry.icon)}
          key={entry.id}
          label={t(`quickInsert.${entry.id}`, entry.label)}
          onToggle={() => {
            setExpandedSections((currentSections) => ({
              ...currentSections,
              [entry.id]: !(currentSections[entry.id] ?? entry.defaultExpanded),
            }))
          }}
        >
          {entry.id === 'table' ? (
            <EditorQuickInsertTableControls
              onConfirm={confirmTable}
              shouldKeepOpen={shouldKeepQuickInsertOpen}
            />
          ) : entry.id === 'codeblocks' ? (
            <EditorQuickInsertCodeblockControls
              onConfirm={confirmCodeBlock}
              shouldKeepOpen={shouldKeepQuickInsertOpen}
            />
          ) : entry.id === 'image' ? (
            <EditorQuickInsertInlineMediaControls
              type="image"
              onConfirm={confirmImage}
              shouldKeepOpen={shouldKeepQuickInsertOpen}
            />
          ) : entry.id === 'link' ? (
            <EditorQuickInsertInlineMediaControls
              type="link"
              onConfirm={confirmLink}
              shouldKeepOpen={shouldKeepQuickInsertOpen}
            />
          ) : entry.id === 'keyboard' ? (
            <EditorQuickInsertKeyboardControls
              onConfirm={confirmKeyboard}
              shouldKeepOpen={shouldKeepQuickInsertOpen}
            />
          ) : entry.id === 'expander' ? (
            <EditorQuickInsertExpanderControls
              onConfirm={confirmExpander}
              shouldKeepOpen={shouldKeepQuickInsertOpen}
            />
          ) : entry.id === 'tag' ? (
            <EditorQuickInsertTagControls
              onConfirm={confirmTag}
              shouldKeepOpen={shouldKeepQuickInsertOpen}
            />
          ) : entry.id === 'callouts' ? (
            renderCalloutSectionChildren(entry)
          ) : (
            entry.children
              .filter((childEntry) =>
                canShowQuickInsertEntry(childEntry, target),
              )
              .map((childEntry) => renderCommandItem(childEntry, true))
          )}
        </EditorQuickInsertMenuSection>
      )
    },
    [
      confirmCodeBlock,
      confirmExpander,
      confirmImage,
      confirmKeyboard,
      confirmLink,
      confirmTag,
      confirmTable,
      expandedSections,
      renderCalloutSectionChildren,
      renderCommandItem,
      shouldKeepQuickInsertOpen,
      t,
      target,
    ],
  )

  if (!editor || target === null || !position) {
    return null
  }

  return (
    <div
      ref={menuRef}
      aria-label={t('quickInsert.title')}
      className="editor-quick-insert-menu"
      data-editor-quick-insert-menu="true"
      onMouseDown={(event) => {
        if (isEditableMenuTarget(event.target)) {
          return
        }

        event.preventDefault()
      }}
      role="menu"
      style={menuStyle}
    >
      <EditorQuickInsertScrollArea>
        {editorQuickInsertMenuEntries.map((entry) => renderMenuEntry(entry))}
      </EditorQuickInsertScrollArea>
    </div>
  )
}

export default EditorQuickInsertMenu
