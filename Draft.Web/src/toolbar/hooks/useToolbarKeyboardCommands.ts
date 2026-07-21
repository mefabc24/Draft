import { useEffect, type RefObject } from 'react'
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import {
  shortcutActionIds,
  type ShortcutActionId,
  type ShortcutBindings,
} from '../../shortcuts/shortcutSettings'
import {
  eventMatchesShortcutAction,
  getMonacoShortcutKeybinding,
} from '../../shortcuts/shortcutMatching'
import { useTranslation } from '../../localization/useTranslation'
import {
  applyHeadingStyle,
  toggleImageSelection,
  toggleLinkSelection,
  toggleWrappedSelection,
  type MarkdownEditorCommand,
} from '../../editor/monaco/markdownCommandAdapter'
import { getInlineFormatMarkers, type HeadingValue } from '../../markdown'
import type { ToolbarSelectionSource } from '../toolbarTypes'

const HTML_COMMENT_MARKERS = getInlineFormatMarkers('comment')

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
  shortcutBindings: ShortcutBindings
}

type ToolbarShortcutCommand = {
  actionId: ShortcutActionId
  command: MarkdownEditorCommand
  options?: {
    focusEditor?: boolean
    switchPreviewLinkToEditor?: boolean
  }
}

function getToolbarActionKeybindings(
  bindings: ShortcutBindings,
  actionId: ShortcutActionId,
) {
  const keybinding = getMonacoShortcutKeybinding(bindings, actionId)

  return keybinding === null ? [] : [keybinding]
}

export function useToolbarKeyboardCommands({
  editor,
  runEditorCommand,
  savedSelectionSourceRef,
  shortcutBindings,
}: UseToolbarKeyboardCommandsOptions) {
  const { t } = useTranslation()

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
        label: t('commands.markdownToolbar.bold'),
        keybindings: getToolbarActionKeybindings(
          shortcutBindings,
          shortcutActionIds.toolbarBold,
        ),
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            toggleWrappedSelection(activeEditor, '**', '**', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.italic',
        label: t('commands.markdownToolbar.italic'),
        keybindings: getToolbarActionKeybindings(
          shortcutBindings,
          shortcutActionIds.toolbarItalic,
        ),
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            toggleWrappedSelection(activeEditor, '*', '*', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.underline',
        label: t('commands.markdownToolbar.underline'),
        keybindings: getToolbarActionKeybindings(
          shortcutBindings,
          shortcutActionIds.toolbarUnderline,
        ),
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            toggleWrappedSelection(activeEditor, '<u>', '</u>', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.inlineCode',
        label: t('commands.markdownToolbar.inlineCode'),
        keybindings: getToolbarActionKeybindings(
          shortcutBindings,
          shortcutActionIds.toolbarInlineCode,
        ),
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            toggleWrappedSelection(activeEditor, '`', '`', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.spoiler',
        label: t('commands.markdownToolbar.spoiler'),
        keybindings: getToolbarActionKeybindings(
          shortcutBindings,
          shortcutActionIds.toolbarSpoiler,
        ),
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            toggleWrappedSelection(activeEditor, '||', '||', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.highlight',
        label: t('commands.markdownToolbar.highlight'),
        keybindings: getToolbarActionKeybindings(
          shortcutBindings,
          shortcutActionIds.toolbarHighlight,
        ),
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            toggleWrappedSelection(activeEditor, '==', '==', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.comment',
        label: t('commands.markdownToolbar.comment'),
        keybindings: getToolbarActionKeybindings(
          shortcutBindings,
          shortcutActionIds.toolbarComment,
        ),
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            toggleWrappedSelection(
              activeEditor,
              HTML_COMMENT_MARKERS.openingMarker,
              HTML_COMMENT_MARKERS.closingMarker,
              commandOptions,
            )
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.strikethrough',
        label: t('commands.markdownToolbar.strikethrough'),
        keybindings: getToolbarActionKeybindings(
          shortcutBindings,
          shortcutActionIds.toolbarStrikethrough,
        ),
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            toggleWrappedSelection(activeEditor, '~~', '~~', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.link',
        label: t('commands.markdownToolbar.link'),
        keybindings: getToolbarActionKeybindings(
          shortcutBindings,
          shortcutActionIds.toolbarLink,
        ),
        run: () => {
          runKeyboardCommand(toggleLinkSelection)
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.image',
        label: t('commands.markdownToolbar.image'),
        keybindings: getToolbarActionKeybindings(
          shortcutBindings,
          shortcutActionIds.toolbarImage,
        ),
        run: () => {
          runKeyboardCommand(toggleImageSelection)
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.heading1',
        label: t('commands.markdownToolbar.heading1'),
        keybindings: getToolbarActionKeybindings(
          shortcutBindings,
          shortcutActionIds.toolbarHeading1,
        ),
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            applyHeadingStyle(activeEditor, 'h1', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.heading2',
        label: t('commands.markdownToolbar.heading2'),
        keybindings: getToolbarActionKeybindings(
          shortcutBindings,
          shortcutActionIds.toolbarHeading2,
        ),
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            applyHeadingStyle(activeEditor, 'h2', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.heading3',
        label: t('commands.markdownToolbar.heading3'),
        keybindings: getToolbarActionKeybindings(
          shortcutBindings,
          shortcutActionIds.toolbarHeading3,
        ),
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            applyHeadingStyle(activeEditor, 'h3', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.heading4',
        label: t('commands.markdownToolbar.heading4'),
        keybindings: getToolbarActionKeybindings(
          shortcutBindings,
          shortcutActionIds.toolbarHeading4,
        ),
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            applyHeadingStyle(activeEditor, 'h4', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.heading5',
        label: t('commands.markdownToolbar.heading5'),
        keybindings: getToolbarActionKeybindings(
          shortcutBindings,
          shortcutActionIds.toolbarHeading5,
        ),
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            applyHeadingStyle(activeEditor, 'h5', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.heading6',
        label: t('commands.markdownToolbar.heading6'),
        keybindings: getToolbarActionKeybindings(
          shortcutBindings,
          shortcutActionIds.toolbarHeading6,
        ),
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            applyHeadingStyle(activeEditor, 'h6', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.normal',
        label: t('commands.markdownToolbar.normalText'),
        keybindings: getToolbarActionKeybindings(
          shortcutBindings,
          shortcutActionIds.toolbarNormalText,
        ),
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
  }, [editor, runEditorCommand, shortcutBindings, t])

  useEffect(() => {
    if (!editor) {
      return
    }

    const previewToolbarCommands: ToolbarShortcutCommand[] = [
      {
        actionId: shortcutActionIds.toolbarBold,
        command: (activeEditor, commandOptions) => {
          toggleWrappedSelection(activeEditor, '**', '**', commandOptions)
        },
      },
      {
        actionId: shortcutActionIds.toolbarItalic,
        command: (activeEditor, commandOptions) => {
          toggleWrappedSelection(activeEditor, '*', '*', commandOptions)
        },
      },
      {
        actionId: shortcutActionIds.toolbarUnderline,
        command: (activeEditor, commandOptions) => {
          toggleWrappedSelection(activeEditor, '<u>', '</u>', commandOptions)
        },
      },
      {
        actionId: shortcutActionIds.toolbarInlineCode,
        command: (activeEditor, commandOptions) => {
          toggleWrappedSelection(activeEditor, '`', '`', commandOptions)
        },
      },
      {
        actionId: shortcutActionIds.toolbarSpoiler,
        command: (activeEditor, commandOptions) => {
          toggleWrappedSelection(activeEditor, '||', '||', commandOptions)
        },
      },
      {
        actionId: shortcutActionIds.toolbarHighlight,
        command: (activeEditor, commandOptions) => {
          toggleWrappedSelection(activeEditor, '==', '==', commandOptions)
        },
      },
      {
        actionId: shortcutActionIds.toolbarComment,
        command: (activeEditor, commandOptions) => {
          toggleWrappedSelection(
            activeEditor,
            HTML_COMMENT_MARKERS.openingMarker,
            HTML_COMMENT_MARKERS.closingMarker,
            commandOptions,
          )
        },
      },
      {
        actionId: shortcutActionIds.toolbarStrikethrough,
        command: (activeEditor, commandOptions) => {
          toggleWrappedSelection(activeEditor, '~~', '~~', commandOptions)
        },
      },
      {
        actionId: shortcutActionIds.toolbarLink,
        command: toggleLinkSelection,
        options: {
          focusEditor: true,
          switchPreviewLinkToEditor: true,
        },
      },
      {
        actionId: shortcutActionIds.toolbarImage,
        command: toggleImageSelection,
        options: {
          focusEditor: true,
          switchPreviewLinkToEditor: true,
        },
      },
      {
        actionId: shortcutActionIds.toolbarNormalText,
        command: (activeEditor, commandOptions) => {
          applyHeadingStyle(activeEditor, 'normal', commandOptions)
        },
      },
      ...(
        [
          [shortcutActionIds.toolbarHeading1, 'h1'],
          [shortcutActionIds.toolbarHeading2, 'h2'],
          [shortcutActionIds.toolbarHeading3, 'h3'],
          [shortcutActionIds.toolbarHeading4, 'h4'],
          [shortcutActionIds.toolbarHeading5, 'h5'],
          [shortcutActionIds.toolbarHeading6, 'h6'],
        ] as const
      ).map<ToolbarShortcutCommand>(([actionId, heading]) => ({
        actionId,
        command: (activeEditor, commandOptions) => {
          applyHeadingStyle(activeEditor, heading as HeadingValue, commandOptions)
        },
      })),
    ]

    const handlePreviewKeyDown = (event: KeyboardEvent) => {
      if (savedSelectionSourceRef.current !== 'preview') {
        return
      }

      const command = previewToolbarCommands.find((entry) =>
        eventMatchesShortcutAction(event, shortcutBindings, entry.actionId),
      )

      if (!command) {
        return
      }

      event.preventDefault()
      runEditorCommand(command.command, command.options ?? { focusEditor: false })
    }

    document.addEventListener('keydown', handlePreviewKeyDown)

    return () => {
      document.removeEventListener('keydown', handlePreviewKeyDown)
    }
  }, [editor, runEditorCommand, savedSelectionSourceRef, shortcutBindings])
}
