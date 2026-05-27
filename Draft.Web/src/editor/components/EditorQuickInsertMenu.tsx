import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from 'react'
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import {
  insertEditorQuickInsertCodeBlock,
  insertEditorQuickInsertImage,
  insertEditorQuickInsertLink,
  insertEditorQuickInsertTable,
  runEditorQuickInsertCommand,
  type EditorQuickInsertCommand,
} from '../commands/editorQuickInsertCommands'
import type { CreateCodeBlockMarkdownData } from '../commands/createCodeBlockMarkdown'
import type {
  CreateInlineImageMarkdownData,
  CreateInlineLinkMarkdownData,
} from '../commands/createInlineLinkMarkdown'
import type { CreateTableMarkdownData } from '../commands/createTableMarkdown'
import type { EditorQuickInsertMenuPosition } from '../hooks/useEditorQuickInsertMenu'
import {
  editorQuickInsertMenuEntries,
  type EditorQuickInsertIconName,
  type EditorQuickInsertMenuEntry,
} from './EditorQuickInsertMenuConfig'
import EditorQuickInsertCodeblockControls from './EditorQuickInsertCodeblockControls'
import EditorQuickInsertInlineMediaControls from './EditorQuickInsertInlineMediaControls'
import EditorQuickInsertMenuItem from './EditorQuickInsertMenuItem'
import EditorQuickInsertMenuSection from './EditorQuickInsertMenuSection'
import EditorQuickInsertTableControls from './EditorQuickInsertTableControls'
import './EditorQuickInsertMenu.css'

type EditorQuickInsertMenuProps = {
  editor: monaco.editor.IStandaloneCodeEditor | null
  lineNumber: number | null
  menuRef: RefObject<HTMLDivElement | null>
  onClose: () => void
  onKeepOpenAction: (action: () => number | false | null) => void
  position: EditorQuickInsertMenuPosition | null
}

type EditorQuickInsertCommandEntry = Extract<
  EditorQuickInsertMenuEntry,
  { type: 'item' }
>

const quickInsertIconPaths: Record<EditorQuickInsertIconName, string> = {
  codeblock: 'icons/Codeblock2.svg',
  heading: 'icons/Headline.svg',
  image: 'icons/Image.svg',
  link: 'icons/Link2.svg',
  list: 'icons/List.svg',
  table: 'icons/Tables.svg',
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
        WebkitMaskImage: `url("${quickInsertIconPaths[icon]}")`,
        maskImage: `url("${quickInsertIconPaths[icon]}")`,
      }}
    />
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

function shouldKeepMenuOpen(event: ReactMouseEvent<HTMLElement>) {
  return event.shiftKey && event.button === 0
}

function EditorQuickInsertMenu({
  editor,
  lineNumber,
  menuRef,
  onClose,
  onKeepOpenAction,
  position,
}: EditorQuickInsertMenuProps) {
  const [expandedSections, setExpandedSections] = useState(
    getInitialExpandedSections,
  )
  const menuStyle = useMemo(
    () =>
      position
        ? ({
            left: `${position.left}px`,
            top: `${position.top}px`,
          }) satisfies CSSProperties
        : undefined,
    [position],
  )

  useEffect(() => {
    if (lineNumber === null) {
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
      if (event.key !== 'Escape') {
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
  }, [lineNumber, menuRef, onClose])

  const runCommand = useCallback(
    (command: EditorQuickInsertCommand, keepOpen = false) => {
      const runAction = () => {
        if (!editor || lineNumber === null) {
          return null
        }

        const result = runEditorQuickInsertCommand(editor, lineNumber, command, {
          advanceToNextEmptyLine: keepOpen,
        })

        return result ? result.nextLineNumber : null
      }

      if (keepOpen) {
        onKeepOpenAction(runAction)
        return
      }

      runAction()
      onClose()
    },
    [editor, lineNumber, onClose, onKeepOpenAction],
  )

  const confirmTable = useCallback(
    (tableData: CreateTableMarkdownData, keepOpen = false) => {
      const runAction = () => {
        if (!editor || lineNumber === null) {
          return null
        }

        const result = insertEditorQuickInsertTable(
          editor,
          lineNumber,
          tableData,
          {
            advanceToNextEmptyLine: keepOpen,
          },
        )

        return result ? result.nextLineNumber : null
      }

      if (keepOpen) {
        onKeepOpenAction(runAction)
        return
      }

      runAction()
      onClose()
    },
    [editor, lineNumber, onClose, onKeepOpenAction],
  )

  const confirmCodeBlock = useCallback(
    (codeBlockData: CreateCodeBlockMarkdownData, keepOpen = false) => {
      const runAction = () => {
        if (!editor || lineNumber === null) {
          return null
        }

        const result = insertEditorQuickInsertCodeBlock(
          editor,
          lineNumber,
          codeBlockData,
          {
            advanceToNextEmptyLine: keepOpen,
          },
        )

        return result ? result.nextLineNumber : null
      }

      if (keepOpen) {
        onKeepOpenAction(runAction)
        return
      }

      runAction()
      onClose()
    },
    [editor, lineNumber, onClose, onKeepOpenAction],
  )

  const confirmImage = useCallback(
    (imageData: CreateInlineImageMarkdownData, keepOpen = false) => {
      const runAction = () => {
        if (!editor || lineNumber === null) {
          return null
        }

        const result = insertEditorQuickInsertImage(
          editor,
          lineNumber,
          imageData,
          {
            advanceToNextEmptyLine: keepOpen,
          },
        )

        return result ? result.nextLineNumber : null
      }

      if (keepOpen) {
        onKeepOpenAction(runAction)
        return
      }

      runAction()
      onClose()
    },
    [editor, lineNumber, onClose, onKeepOpenAction],
  )

  const confirmLink = useCallback(
    (linkData: CreateInlineLinkMarkdownData, keepOpen = false) => {
      const runAction = () => {
        if (!editor || lineNumber === null) {
          return null
        }

        const result = insertEditorQuickInsertLink(
          editor,
          lineNumber,
          linkData,
          {
            advanceToNextEmptyLine: keepOpen,
          },
        )

        return result ? result.nextLineNumber : null
      }

      if (keepOpen) {
        onKeepOpenAction(runAction)
        return
      }

      runAction()
      onClose()
    },
    [editor, lineNumber, onClose, onKeepOpenAction],
  )

  const renderCommandItem = useCallback(
    (entry: EditorQuickInsertCommandEntry, nested = false) => (
      <EditorQuickInsertMenuItem
        icon={getQuickInsertIcon(entry.icon)}
        key={entry.id}
        label={entry.label}
        nested={nested}
        onSelect={(event) => {
          runCommand(entry.command, shouldKeepMenuOpen(event))
        }}
        shortcut={entry.shortcut}
      />
    ),
    [runCommand],
  )

  const renderMenuEntry = useCallback(
    (entry: EditorQuickInsertMenuEntry) => {
      if (entry.type === 'item') {
        return renderCommandItem(entry)
      }

      const expanded = expandedSections[entry.id] ?? entry.defaultExpanded

      return (
        <EditorQuickInsertMenuSection
          expanded={expanded}
          icon={getQuickInsertIcon(entry.icon)}
          key={entry.id}
          label={entry.label}
          onToggle={() => {
            setExpandedSections((currentSections) => ({
              ...currentSections,
              [entry.id]: !(currentSections[entry.id] ?? entry.defaultExpanded),
            }))
          }}
        >
          {entry.id === 'table' ? (
            <EditorQuickInsertTableControls onConfirm={confirmTable} />
          ) : entry.id === 'codeblocks' ? (
            <EditorQuickInsertCodeblockControls onConfirm={confirmCodeBlock} />
          ) : entry.id === 'image' ? (
            <EditorQuickInsertInlineMediaControls
              type="image"
              onConfirm={confirmImage}
            />
          ) : entry.id === 'link' ? (
            <EditorQuickInsertInlineMediaControls
              type="link"
              onConfirm={confirmLink}
            />
          ) : (
            entry.children.map((childEntry) =>
              renderCommandItem(childEntry, true),
            )
          )}
        </EditorQuickInsertMenuSection>
      )
    },
    [
      confirmCodeBlock,
      confirmImage,
      confirmLink,
      confirmTable,
      expandedSections,
      renderCommandItem,
    ],
  )

  if (!editor || lineNumber === null || !position) {
    return null
  }

  return (
    <div
      ref={menuRef}
      aria-label="Editor Quick Insert Menu"
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
      <div className="editor-quick-insert-menu-list">
        {editorQuickInsertMenuEntries.map((entry) => renderMenuEntry(entry))}
      </div>
    </div>
  )
}

export default EditorQuickInsertMenu
