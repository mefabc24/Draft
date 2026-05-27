import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import {
  insertEditorQuickInsertCodeBlock,
  insertEditorQuickInsertTable,
  runEditorQuickInsertCommand,
  type EditorQuickInsertCommand,
} from '../commands/editorQuickInsertCommands'
import type { CreateCodeBlockMarkdownData } from '../commands/createCodeBlockMarkdown'
import type { CreateTableMarkdownData } from '../commands/createTableMarkdown'
import type { EditorQuickInsertMenuPosition } from '../hooks/useEditorQuickInsertMenu'
import {
  editorQuickInsertMenuEntries,
  type EditorQuickInsertIconName,
  type EditorQuickInsertMenuEntry,
} from './EditorQuickInsertMenuConfig'
import EditorQuickInsertCodeblockControls from './EditorQuickInsertCodeblockControls'
import EditorQuickInsertMenuItem from './EditorQuickInsertMenuItem'
import EditorQuickInsertMenuSection from './EditorQuickInsertMenuSection'
import EditorQuickInsertTableControls from './EditorQuickInsertTableControls'
import './EditorQuickInsertMenu.css'

type EditorQuickInsertMenuProps = {
  editor: monaco.editor.IStandaloneCodeEditor | null
  lineNumber: number | null
  menuRef: RefObject<HTMLDivElement | null>
  onClose: () => void
  position: EditorQuickInsertMenuPosition | null
}

type EditorQuickInsertCommandEntry = Extract<
  EditorQuickInsertMenuEntry,
  { type: 'item' }
>

function HeadingIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20">
      <rect height="14" rx="2.5" width="14" x="3" y="3" />
      <path d="M8.35 6.5 7.55 13.5M12.45 6.5 11.65 13.5M6.5 8.45h7M6.05 11.55h7" />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20">
      <rect height="14" rx="2.5" width="14" x="3" y="3" />
      <circle cx="7.15" cy="7.4" r="1.25" />
      <path d="m4.75 14.25 3.4-3.4 2.05 2.05 1.35-1.35 3.7 3.7" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20">
      <path d="M8 5h8M8 10h8M8 15h8" />
      <path d="M4 5h.01M4 10h.01M4 15h.01" />
    </svg>
  )
}

function TableIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20">
      <rect height="14" rx="2.5" width="14" x="3" y="3" />
      <path d="M3 7.65h14M3 12.35h14M7.65 3v14M12.35 3v14" />
    </svg>
  )
}

function CodeblockIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20">
      <rect height="12" rx="2.25" width="14" x="3" y="4" />
      <path d="m8.15 7.55-2.25 2.45 2.25 2.45M11.85 7.55l2.25 2.45-2.25 2.45M10.85 7.25 9.15 12.75" />
    </svg>
  )
}

function getQuickInsertIcon(icon: EditorQuickInsertIconName | undefined) {
  switch (icon) {
    case 'codeblock':
      return <CodeblockIcon />
    case 'heading':
      return <HeadingIcon />
    case 'image':
      return <ImageIcon />
    case 'list':
      return <ListIcon />
    case 'table':
      return <TableIcon />
    default:
      return undefined
  }
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

function EditorQuickInsertMenu({
  editor,
  lineNumber,
  menuRef,
  onClose,
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
    (command: EditorQuickInsertCommand) => {
      if (editor && lineNumber !== null) {
        runEditorQuickInsertCommand(editor, lineNumber, command)
      }

      onClose()
    },
    [editor, lineNumber, onClose],
  )

  const confirmTable = useCallback(
    (tableData: CreateTableMarkdownData) => {
      if (editor && lineNumber !== null) {
        insertEditorQuickInsertTable(editor, lineNumber, tableData)
      }

      onClose()
    },
    [editor, lineNumber, onClose],
  )

  const confirmCodeBlock = useCallback(
    (codeBlockData: CreateCodeBlockMarkdownData) => {
      if (editor && lineNumber !== null) {
        insertEditorQuickInsertCodeBlock(editor, lineNumber, codeBlockData)
      }

      onClose()
    },
    [editor, lineNumber, onClose],
  )

  const renderCommandItem = useCallback(
    (entry: EditorQuickInsertCommandEntry, nested = false) => (
      <EditorQuickInsertMenuItem
        icon={getQuickInsertIcon(entry.icon)}
        key={entry.id}
        label={entry.label}
        nested={nested}
        onSelect={() => {
          runCommand(entry.command)
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
          ) : (
            entry.children.map((childEntry) =>
              renderCommandItem(childEntry, true),
            )
          )}
        </EditorQuickInsertMenuSection>
      )
    },
    [confirmCodeBlock, confirmTable, expandedSections, renderCommandItem],
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
