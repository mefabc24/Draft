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
    bool IsEditable = true,
    IReadOnlyList<string>? SearchKeywords = null);

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
                        "Ctrl + S",
                        SearchKeywords: ["write", "store", "persist", "document", "file"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.AppOpen,
                        "Open file",
                        "Open a Markdown or text file.",
                        "Ctrl + O",
                        SearchKeywords: ["load", "browse", "choose", "document", "file"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.FindReplaceToggle,
                        "Find and replace",
                        "Toggle the Find and Replace window in the workspace.",
                        "Ctrl + F",
                        SearchKeywords: ["search", "change", "lookup", "locate", "substitute"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorUndo,
                        "Undo",
                        "Undo the latest editor change, even when focus is outside the editor.",
                        "Ctrl + Z",
                        SearchKeywords: ["revert", "reverse", "back", "rollback", "history"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorRedo,
                        "Redo",
                        "Redo the latest editor change, even when focus is outside the editor.",
                        "Ctrl + Shift + Z",
                        SearchKeywords: ["repeat", "restore", "forward", "history"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorDuplicateLine,
                        "Duplicate current line",
                        "Duplicate the active editor line.",
                        "Ctrl + D",
                        SearchKeywords: ["copy", "clone", "repeat", "line"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorToggleLineCapitalization,
                        "Toggle line capitalization",
                        "Toggle the first letter capitalization of the current line.",
                        "Ctrl + Alt + U",
                        SearchKeywords: ["capitalize", "sentence case", "first letter", "toggle case"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorUppercaseSelection,
                        "Uppercase selection",
                        "Convert the selected text to uppercase.",
                        "Ctrl + Shift + U",
                        SearchKeywords: ["upper", "caps", "capital letters", "case", "convert"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorLowercaseSelection,
                        "Lowercase selection",
                        "Convert the selected text to lowercase.",
                        "Ctrl + Shift + L",
                        SearchKeywords: ["lower", "small letters", "case", "convert"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorMoveLineUp,
                        "Move line or selection up",
                        "Move the active editor line or selected lines up.",
                        "Ctrl + Shift + Up",
                        SearchKeywords: ["reorder", "shift", "raise", "line", "selection"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorMoveLineDown,
                        "Move line or selection down",
                        "Move the active editor line or selected lines down.",
                        "Ctrl + Shift + Down",
                        SearchKeywords: ["reorder", "shift", "lower", "line", "selection"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorMoveCursorWordLeft,
                        "Move cursor one word left",
                        "Move the editor cursor one word left.",
                        "Ctrl + Left",
                        SearchKeywords: ["caret", "previous word", "navigate", "backward"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorMoveCursorWordRight,
                        "Move cursor one word right",
                        "Move the editor cursor one word right.",
                        "Ctrl + Right",
                        SearchKeywords: ["caret", "next word", "navigate", "forward"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorMoveCursorNextLineStart,
                        "Move cursor to start of next line",
                        "Move the editor cursor down one line and then to the start of that line.",
                        string.Empty,
                        SearchKeywords: ["caret", "next line", "line start", "beginning", "home", "down"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorExtendSelectionWordLeft,
                        "Extend selection one word left",
                        "Extend the editor selection one word left.",
                        "Ctrl + Shift + Left",
                        SearchKeywords: ["select", "previous word", "expand", "highlight", "backward"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorExtendSelectionWordRight,
                        "Extend selection one word right",
                        "Extend the editor selection one word right.",
                        "Ctrl + Shift + Right",
                        SearchKeywords: ["select", "next word", "expand", "highlight", "forward"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorAddSelectionRange,
                        "Add separate selection",
                        "Hold the configured keys and drag with the left mouse button to add another independent selection. Double-click a word while holding the keys to add that word as another selection.",
                        "Ctrl + Shift + Alt",
                        FixedMouseGesture: ShortcutFixedMouseGesture.LeftDragOrDoubleClick,
                        SearchKeywords: ["multi cursor", "multiple selection", "add cursor", "drag", "double click"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorContinueMarkdownBlock,
                        "Continue Markdown block",
                        "Continue the current list or quote on the next line.",
                        "Enter",
                        Scope: ShortcutScope.EditorTextInput,
                        SearchKeywords: ["list", "quote", "blockquote", "new line", "enter", "markdown"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.EditorIndentListItem,
                        "Indent list item",
                        "Indent an empty Markdown list item.",
                        "Tab",
                        Scope: ShortcutScope.EditorTextInput,
                        SearchKeywords: ["nest", "tab", "list", "markdown", "move right"]),
                }),
            new ShortcutCategoryDefinition(
                "FLOATING MARKDOWN TOOLBAR",
                new[]
                {
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarBold,
                        "Bold",
                        "Toggle bold Markdown around the current selection.",
                        "Ctrl + B",
                        SearchKeywords: ["strong", "heavy", "font weight", "format"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarItalic,
                        "Italic",
                        "Toggle italic Markdown around the current selection.",
                        "Ctrl + I",
                        SearchKeywords: ["emphasis", "em", "slanted", "format"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarUnderline,
                        "Underline",
                        "Toggle underline HTML tags around the current selection.",
                        "Ctrl + U",
                        SearchKeywords: ["underlined", "line below", "html", "format"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarInlineCode,
                        "Inline code",
                        "Toggle inline code Markdown around the current selection.",
                        "Ctrl + E",
                        SearchKeywords: ["code", "monospace", "backticks", "snippet", "format"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarSpoiler,
                        "Spoiler",
                        "Toggle spoiler Markdown around the current selection.",
                        "Ctrl + Shift + S",
                        SearchKeywords: ["hide", "hidden", "conceal", "reveal", "format"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarHighlight,
                        "Highlight",
                        "Toggle highlight Markdown around the current selection.",
                        "Ctrl + Shift + H",
                        SearchKeywords: ["mark", "marker", "background", "emphasize", "format"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarComment,
                        "Comment",
                        "Toggle an HTML comment around the current selection.",
                        "Ctrl + /",
                        SearchKeywords: ["html", "note", "hide", "annotation", "format"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarStrikethrough,
                        "Strikethrough",
                        "Toggle strikethrough Markdown around the current selection.",
                        "Ctrl + Shift + X",
                        SearchKeywords: ["strike", "cross out", "deleted", "remove", "format"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarLink,
                        "Link",
                        "Create or edit a Markdown link for the current selection.",
                        "Ctrl + K",
                        SearchKeywords: ["url", "hyperlink", "website", "anchor", "markdown"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarImage,
                        "Image",
                        "Create or edit a Markdown image for the current selection.",
                        "Ctrl + Alt + I",
                        SearchKeywords: ["picture", "photo", "media", "graphic", "markdown"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarNormalText,
                        "Normal text",
                        "Convert the current line back to normal paragraph text.",
                        "Ctrl + N",
                        SearchKeywords: ["paragraph", "plain text", "body", "reset formatting", "remove heading"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarHeading1,
                        "Heading 1",
                        "Apply the first Markdown heading level.",
                        "Ctrl + 1",
                        SearchKeywords: ["headline", "title", "h1", "level 1", "largest heading"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarHeading2,
                        "Heading 2",
                        "Apply the second Markdown heading level.",
                        "Ctrl + 2",
                        SearchKeywords: ["headline", "subtitle", "h2", "level 2", "section heading"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarHeading3,
                        "Heading 3",
                        "Apply the third Markdown heading level.",
                        "Ctrl + 3",
                        SearchKeywords: ["headline", "subtitle", "h3", "level 3", "section heading"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarHeading4,
                        "Heading 4",
                        "Apply the fourth Markdown heading level.",
                        "Ctrl + 4",
                        SearchKeywords: ["headline", "subtitle", "h4", "level 4", "section heading"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarHeading5,
                        "Heading 5",
                        "Apply the fifth Markdown heading level.",
                        "Ctrl + 5",
                        SearchKeywords: ["headline", "subtitle", "h5", "level 5", "section heading"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarHeading6,
                        "Heading 6",
                        "Apply the sixth Markdown heading level.",
                        "Ctrl + 6",
                        SearchKeywords: ["headline", "subtitle", "h6", "level 6", "smallest heading"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarEditPreviewSelection,
                        "Edit preview selection",
                        "Edit the selected preview source Markdown.",
                        "Ctrl + Shift + E",
                        SearchKeywords: ["preview", "source", "markdown", "selected text", "change"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarConfirmEdit,
                        "Confirm toolbar edit",
                        "Apply changes in the toolbar's link, image, or preview edit menu.",
                        "Enter",
                        Scope: ShortcutScope.ToolbarOverlay,
                        SearchKeywords: ["apply", "accept", "submit", "done", "save", "enter"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.ToolbarClose,
                        "Close toolbar or edit menu",
                        "Dismiss the floating toolbar selection or cancel an open edit menu.",
                        "Esc",
                        Scope: ShortcutScope.ToolbarOverlay,
                        SearchKeywords: ["cancel", "dismiss", "escape", "exit", "hide", "menu"]),
                }),
            new ShortcutCategoryDefinition(
                "QUICK INSERT MENU",
                new[]
                {
                    new ShortcutActionDefinition(
                        ShortcutActionIds.QuickInsertOpenMenu,
                        "Open Quick Insert Menu",
                        "Open the Quick Insert Menu at the current editor cursor position.",
                        "Ctrl + Space",
                        SearchKeywords: ["insert", "add block", "commands", "picker", "popup", "qim"]),
                    new ShortcutActionDefinition(
                        ShortcutActionIds.QuickInsertKeepOpen,
                        "Insert and keep menu open",
                        "Hold the configured keys and click a Quick Insert item with the left mouse button to insert it and keep the menu open for the next empty line.",
                        "Shift",
                        FixedMouseGesture: ShortcutFixedMouseGesture.LeftClick,
                        SearchKeywords: ["quick insert", "repeat", "multiple", "stay open", "shift click", "qim"]),
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
        if (string.IsNullOrWhiteSpace(shortcut)
            && string.IsNullOrWhiteSpace(action.DefaultShortcut))
        {
            normalizedShortcut = string.Empty;
            return true;
        }

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
