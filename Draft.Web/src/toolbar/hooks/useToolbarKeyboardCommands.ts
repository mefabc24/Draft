import { useEffect, type RefObject } from 'react'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import {
  applyHeadingStyle,
  toggleImageSelection,
  toggleLinkSelection,
  toggleWrappedSelection,
  type MarkdownEditorCommand,
} from '../../editor/monaco/markdownCommandAdapter'
import type { HeadingValue } from '../../markdown'
import type { ToolbarSelectionSource } from '../toolbarTypes'

type RunToolbarEditorCommand = (
  command: MarkdownEditorCommand,
  options?: {
    focusEditor?: boolean
    restoreSavedSelection?: boolean
    switchPreviewLinkToEditor?: boolean
  },
) => void

type UseToolbarKeyboardCommandsOptions = {
  editor: monaco.editor.IStandaloneCodeEditor | null
  runEditorCommand: RunToolbarEditorCommand
  savedSelectionSourceRef: RefObject<ToolbarSelectionSource | null>
}

export function useToolbarKeyboardCommands({
  editor,
  runEditorCommand,
  savedSelectionSourceRef,
}: UseToolbarKeyboardCommandsOptions) {
  useEffect(() => {
    if (!editor) {
      return
    }

    const runKeyboardCommand = (command: MarkdownEditorCommand) => {
      runEditorCommand(command, {
        focusEditor: true,
        restoreSavedSelection: false,
      })
    }

    const actions = [
      editor.addAction({
        id: 'draft.markdownToolbar.bold',
        label: 'Markdown: Toggle Bold',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB],
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            toggleWrappedSelection(activeEditor, '**', '**', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.italic',
        label: 'Markdown: Toggle Italic',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI],
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            toggleWrappedSelection(activeEditor, '*', '*', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.underline',
        label: 'Markdown: Toggle Underline',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyU],
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            toggleWrappedSelection(activeEditor, '<u>', '</u>', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.inlineCode',
        label: 'Markdown: Toggle Inline Code',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE],
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            toggleWrappedSelection(activeEditor, '`', '`', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.strikethrough',
        label: 'Markdown: Toggle Strikethrough',
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyX,
        ],
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            toggleWrappedSelection(activeEditor, '~~', '~~', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.link',
        label: 'Markdown: Toggle Link',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK],
        run: () => {
          runKeyboardCommand(toggleLinkSelection)
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.image',
        label: 'Markdown: Toggle Image',
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyI,
        ],
        run: () => {
          runKeyboardCommand(toggleImageSelection)
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.heading1',
        label: 'Markdown: Heading 1',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Digit1],
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            applyHeadingStyle(activeEditor, 'h1', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.heading2',
        label: 'Markdown: Heading 2',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Digit2],
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            applyHeadingStyle(activeEditor, 'h2', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.heading3',
        label: 'Markdown: Heading 3',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Digit3],
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            applyHeadingStyle(activeEditor, 'h3', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.heading4',
        label: 'Markdown: Heading 4',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Digit4],
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            applyHeadingStyle(activeEditor, 'h4', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.heading5',
        label: 'Markdown: Heading 5',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Digit5],
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            applyHeadingStyle(activeEditor, 'h5', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.heading6',
        label: 'Markdown: Heading 6',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Digit6],
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            applyHeadingStyle(activeEditor, 'h6', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.normal',
        label: 'Markdown: Normal Text',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN],
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            applyHeadingStyle(activeEditor, 'normal', commandOptions)
          })
        },
      }),
    ]

    return () => {
      for (const action of actions) {
        action.dispose()
      }
    }
  }, [editor, runEditorCommand])

  useEffect(() => {
    if (!editor) {
      return
    }

    const handlePreviewKeyDown = (event: KeyboardEvent) => {
      if (
        savedSelectionSourceRef.current !== 'preview' ||
        !(event.ctrlKey || event.metaKey)
      ) {
        return
      }

      const key = event.key.toLowerCase()
      const code = event.code
      let command: MarkdownEditorCommand | null = null
      let options: {
        focusEditor?: boolean
        switchPreviewLinkToEditor?: boolean
      } = { focusEditor: false }

      if (!event.shiftKey && event.altKey && key === 'i') {
        command = toggleImageSelection
        options = {
          focusEditor: true,
          switchPreviewLinkToEditor: true,
        }
      } else if (!event.shiftKey && !event.altKey && key === 'b') {
        command = (activeEditor, commandOptions) => {
          toggleWrappedSelection(activeEditor, '**', '**', commandOptions)
        }
      } else if (!event.shiftKey && !event.altKey && key === 'i') {
        command = (activeEditor, commandOptions) => {
          toggleWrappedSelection(activeEditor, '*', '*', commandOptions)
        }
      } else if (!event.shiftKey && !event.altKey && key === 'u') {
        command = (activeEditor, commandOptions) => {
          toggleWrappedSelection(activeEditor, '<u>', '</u>', commandOptions)
        }
      } else if (!event.shiftKey && !event.altKey && key === 'e') {
        command = (activeEditor, commandOptions) => {
          toggleWrappedSelection(activeEditor, '`', '`', commandOptions)
        }
      } else if (event.shiftKey && !event.altKey && key === 'x') {
        command = (activeEditor, commandOptions) => {
          toggleWrappedSelection(activeEditor, '~~', '~~', commandOptions)
        }
      } else if (!event.shiftKey && !event.altKey && key === 'k') {
        command = toggleLinkSelection
        options = {
          focusEditor: true,
          switchPreviewLinkToEditor: true,
        }
      } else if (!event.shiftKey && !event.altKey && key === 'n') {
        command = (activeEditor, commandOptions) => {
          applyHeadingStyle(activeEditor, 'normal', commandOptions)
        }
      } else if (!event.shiftKey && !event.altKey && /^Digit[1-6]$/u.test(code)) {
        command = (activeEditor, commandOptions) => {
          applyHeadingStyle(
            activeEditor,
            `h${code.replace('Digit', '')}` as HeadingValue,
            commandOptions,
          )
        }
      }

      if (!command) {
        return
      }

      event.preventDefault()
      runEditorCommand(command, options)
    }

    document.addEventListener('keydown', handlePreviewKeyDown)

    return () => {
      document.removeEventListener('keydown', handlePreviewKeyDown)
    }
  }, [editor, runEditorCommand, savedSelectionSourceRef])
}
