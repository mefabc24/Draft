namespace Draft.Settings.Shortcuts;

public enum ShortcutFixedMouseGesture
{
    None,
    LeftClick,
    MiddleClick,
    RightClick,
    LeftDoubleClick,
    MiddleDoubleClick,
    RightDoubleClick,
    LeftDrag,
    MiddleDrag,
    RightDrag,
    WheelUp,
    WheelDown,
    LeftDragOrDoubleClick,
}

public sealed record ShortcutActionDefinition(
    string Id,
    string Title,
    string Description,
    string DefaultShortcut,
    ShortcutFixedMouseGesture FixedMouseGesture = ShortcutFixedMouseGesture.None,
    ShortcutScope Scope = ShortcutScope.Global,
    bool IsEditable = true);

public sealed record ShortcutCategoryDefinition(
    string Title,
    IReadOnlyList<ShortcutActionDefinition> Shortcuts);

public static class ShortcutSettingsCatalog
{
    public static IReadOnlyList<ShortcutCategoryDefinition> Categories { get; } =
        new[]
        {
            new ShortcutCategoryDefinition(
                "GENERAL",
                new[]
                {
                    new ShortcutActionDefinition(
                        ShortcutActionIds.AppSave,
                        "Save file",
                        "Save the current document, or open Save As when it has no file path.",
                        "Ctrl + S"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.AppOpen,
                        "Open file",
                        "Open a Markdown or text file.",
                        "Ctrl + O"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.FindReplaceToggle,
                        "Find and replace",
                        "Toggle the Find and Replace window in the workspace.",
                        "Ctrl + F"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorUndo,
                        "Undo",
                        "Undo the latest editor change, even when focus is outside the editor.",
                        "Ctrl + Z"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorRedo,
                        "Redo",
                        "Redo the latest editor change, even when focus is outside the editor.",
                        "Ctrl + Shift + Z"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorDuplicateLine,
                        "Duplicate current line",
                        "Duplicate the active editor line.",
                        "Ctrl + D"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorToggleLineCapitalization,
                        "Toggle line capitalization",
                        "Toggle the first letter capitalization of the current line.",
                        "Ctrl + Alt + U"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorUppercaseSelection,
                        "Uppercase selection",
                        "Convert the selected text to uppercase.",
                        "Ctrl + Shift + U"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorLowercaseSelection,
                        "Lowercase selection",
                        "Convert the selected text to lowercase.",
                        "Ctrl + Shift + L"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorMoveLineUp,
                        "Move line or selection up",
                        "Move the active editor line or selected lines up.",
                        "Ctrl + Shift + Up"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorMoveLineDown,
                        "Move line or selection down",
                        "Move the active editor line or selected lines down.",
                        "Ctrl + Shift + Down"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorMoveCursorWordLeft,
                        "Move cursor one word left",
                        "Move the editor cursor one word left.",
                        "Ctrl + Left"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorMoveCursorWordRight,
                        "Move cursor one word right",
                        "Move the editor cursor one word right.",
                        "Ctrl + Right"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorExtendSelectionWordLeft,
                        "Extend selection one word left",
                        "Extend the editor selection one word left.",
                        "Ctrl + Shift + Left"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorExtendSelectionWordRight,
                        "Extend selection one word right",
                        "Extend the editor selection one word right.",
                        "Ctrl + Shift + Right"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorAddSelectionRange,
                        "Add separate selection",
                        "Hold the configured keys and drag with the left mouse button to add another independent selection. Double-click a word while holding the keys to add that word as another selection.",
                        "Ctrl + Shift + Alt",
                        FixedMouseGesture: ShortcutFixedMouseGesture.LeftDragOrDoubleClick),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorContinueMarkdownBlock,
                        "Continue Markdown block",
                        "Continue the current list or quote on the next line.",
                        "Enter",
                        Scope: ShortcutScope.EditorTextInput),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorIndentListItem,
                        "Indent list item",
                        "Indent an empty Markdown list item.",
                        "Tab",
                        Scope: ShortcutScope.EditorTextInput),
                }),
            new ShortcutCategoryDefinition(
                "FLOATING MARKDOWN TOOLBAR",
                new[]
                {
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarBold,
                        "Bold",
                        "Toggle bold Markdown around the current selection.",
                        "Ctrl + B"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarItalic,
                        "Italic",
                        "Toggle italic Markdown around the current selection.",
                        "Ctrl + I"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarUnderline,
                        "Underline",
                        "Toggle underline HTML tags around the current selection.",
                        "Ctrl + U"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarInlineCode,
                        "Inline code",
                        "Toggle inline code Markdown around the current selection.",
                        "Ctrl + E"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarSpoiler,
                        "Spoiler",
                        "Toggle spoiler Markdown around the current selection.",
                        "Ctrl + Shift + S"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarHighlight,
                        "Highlight",
                        "Toggle highlight Markdown around the current selection.",
                        "Ctrl + Shift + H"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarComment,
                        "Comment",
                        "Toggle an HTML comment around the current selection.",
                        "Ctrl + /"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarStrikethrough,
                        "Strikethrough",
                        "Toggle strikethrough Markdown around the current selection.",
                        "Ctrl + Shift + X"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarLink,
                        "Link",
                        "Create or edit a Markdown link for the current selection.",
                        "Ctrl + K"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarImage,
                        "Image",
                        "Create or edit a Markdown image for the current selection.",
                        "Ctrl + Alt + I"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarNormalText,
                        "Normal text",
                        "Convert the current line back to normal paragraph text.",
                        "Ctrl + N"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarHeading1,
                        "Heading 1",
                        "Apply the first Markdown heading level.",
                        "Ctrl + 1"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarHeading2,
                        "Heading 2",
                        "Apply the second Markdown heading level.",
                        "Ctrl + 2"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarHeading3,
                        "Heading 3",
                        "Apply the third Markdown heading level.",
                        "Ctrl + 3"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarHeading4,
                        "Heading 4",
                        "Apply the fourth Markdown heading level.",
                        "Ctrl + 4"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarHeading5,
                        "Heading 5",
                        "Apply the fifth Markdown heading level.",
                        "Ctrl + 5"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarHeading6,
                        "Heading 6",
                        "Apply the sixth Markdown heading level.",
                        "Ctrl + 6"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarEditPreviewSelection,
                        "Edit preview selection",
                        "Edit the selected preview source Markdown.",
                        "Ctrl + Shift + E"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarConfirmEdit,
                        "Confirm toolbar edit",
                        "Apply changes in the toolbar's link, image, or preview edit menu.",
                        "Enter",
                        Scope: ShortcutScope.ToolbarOverlay),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarClose,
                        "Close toolbar or edit menu",
                        "Dismiss the floating toolbar selection or cancel an open edit menu.",
                        "Esc",
                        Scope: ShortcutScope.ToolbarOverlay),
                }),
            new ShortcutCategoryDefinition(
                "QUICK INSERT MENU",
                new[]
                {
                    new ShortcutActionDefinition(
                        ShortcutActionIds.QuickInsertOpenMenu,
                        "Open Quick Insert Menu",
                        "Open the Quick Insert Menu at the current editor cursor position.",
                        "Ctrl + Space"),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.QuickInsertKeepOpen,
                        "Insert and keep menu open",
                        "Hold the configured keys and click a Quick Insert item with the left mouse button to insert it and keep the menu open for the next empty line.",
                        "Shift",
                        FixedMouseGesture: ShortcutFixedMouseGesture.LeftClick),
                }),
        };

    public static IReadOnlyList<ShortcutActionDefinition> Actions { get; } =
        Categories.SelectMany(category => category.Shortcuts).ToArray();

    private static IReadOnlyDictionary<string, ShortcutActionDefinition> ActionById { get; } =
        Actions.ToDictionary(action => action.Id, StringComparer.Ordinal);

    public static Dictionary<string, string> CreateDefaultShortcuts()
    {
        return Actions.ToDictionary(
            action => action.Id,
            action => action.DefaultShortcut,
            StringComparer.Ordinal);
    }

    public static Dictionary<string, string> Normalize(
        IDictionary<string, string>? shortcuts)
    {
        Dictionary<string, string> normalized = CreateDefaultShortcuts();

        if (shortcuts is null)
            return normalized;

        foreach ((string id, string shortcut) in shortcuts)
        {
            if (!ActionById.TryGetValue(id, out ShortcutActionDefinition? action)
                || !TryNormalizeShortcut(action, shortcut, out string normalizedShortcut))
            {
                continue;
            }

            normalized[id] = normalizedShortcut;
        }

        return normalized;
    }

    public static string GetShortcut(
        IReadOnlyDictionary<string, string>? shortcuts,
        string id)
    {
        if (shortcuts is not null
            && shortcuts.TryGetValue(id, out string? shortcut)
            && ActionById.TryGetValue(id, out ShortcutActionDefinition? storedAction)
            && TryNormalizeShortcut(storedAction, shortcut, out string normalizedShortcut))
        {
            return normalizedShortcut;
        }

        return ActionById.TryGetValue(id, out ShortcutActionDefinition? action)
            ? action.DefaultShortcut
            : string.Empty;
    }

    public static bool IsValidShortcut(string shortcut)
    {
        return ShortcutNormalizer.TryNormalizeKeyboardShortcut(
            shortcut,
            allowModifierOnly: false,
            removeLegacyMouseGestures: false,
            out _,
            out _);
    }

    public static bool TryNormalizeShortcut(
        string actionId,
        string shortcut,
        out string normalizedShortcut)
    {
        normalizedShortcut = string.Empty;

        return ActionById.TryGetValue(actionId, out ShortcutActionDefinition? action)
            && TryNormalizeShortcut(action, shortcut, out normalizedShortcut);
    }

    private static bool TryNormalizeShortcut(
        ShortcutActionDefinition action,
        string shortcut,
        out string normalizedShortcut)
    {
        bool hasFixedMouseGesture =
            action.FixedMouseGesture != ShortcutFixedMouseGesture.None;

        return ShortcutNormalizer.TryNormalizeKeyboardShortcut(
            shortcut,
            allowModifierOnly: hasFixedMouseGesture,
            removeLegacyMouseGestures: hasFixedMouseGesture,
            out normalizedShortcut,
            out _);
    }
}
