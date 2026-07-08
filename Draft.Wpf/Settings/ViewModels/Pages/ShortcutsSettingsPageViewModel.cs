namespace Draft.Settings.ViewModels.Pages;

public sealed class ShortcutsSettingsPageViewModel : SettingsPageViewModel
{
    public ShortcutsSettingsPageViewModel(SettingsWindowViewModel settings)
        : base("Shortcuts", settings)
    {
        Categories = new[]
        {
            new ShortcutCategoryViewModel(
                "GENERAL",
                new[]
                {
                    new ShortcutItemViewModel(
                        "Save file",
                        "Save the current document, or open Save As when it has no file path.",
                        "Ctrl + S"),
                    new ShortcutItemViewModel(
                        "Undo",
                        "Undo the latest editor change, even when focus is outside the editor.",
                        "Ctrl + Z"),
                    new ShortcutItemViewModel(
                        "Redo",
                        "Redo the latest editor change, even when focus is outside the editor.",
                        "Ctrl + Shift + Z"),
                    new ShortcutItemViewModel(
                        "Duplicate current line",
                        "Duplicate the active editor line.",
                        "Ctrl + D"),
                    new ShortcutItemViewModel(
                        "Move line or selection",
                        "Move the active editor line or selected lines up or down.",
                        "Ctrl + Shift + Up / Down"),
                    new ShortcutItemViewModel(
                        "Move by word",
                        "Move the cursor one word left or right in the editor.",
                        "Ctrl + Left / Right"),
                    new ShortcutItemViewModel(
                        "Select by word",
                        "Extend the selection one word left or right.",
                        "Ctrl + Shift + Left / Right"),
                    new ShortcutItemViewModel(
                        "Continue Markdown block",
                        "Continue the current list or quote on the next line.",
                        "Enter"),
                    new ShortcutItemViewModel(
                        "Indent list item",
                        "Indent an empty Markdown list item.",
                        "Tab"),
                }),
            new ShortcutCategoryViewModel(
                "FLOATING MARKDOWN TOOLBAR",
                new[]
                {
                    new ShortcutItemViewModel(
                        "Bold",
                        "Toggle bold Markdown around the current selection.",
                        "Ctrl + B"),
                    new ShortcutItemViewModel(
                        "Italic",
                        "Toggle italic Markdown around the current selection.",
                        "Ctrl + I"),
                    new ShortcutItemViewModel(
                        "Underline",
                        "Toggle underline HTML tags around the current selection.",
                        "Ctrl + U"),
                    new ShortcutItemViewModel(
                        "Inline code",
                        "Toggle inline code Markdown around the current selection.",
                        "Ctrl + E"),
                    new ShortcutItemViewModel(
                        "Spoiler",
                        "Toggle spoiler Markdown around the current selection.",
                        "Ctrl + Shift + S"),
                    new ShortcutItemViewModel(
                        "Highlight",
                        "Toggle highlight Markdown around the current selection.",
                        "Ctrl + Shift + H"),
                    new ShortcutItemViewModel(
                        "Comment",
                        "Toggle hidden comment Markdown around the current selection.",
                        "Ctrl + /"),
                    new ShortcutItemViewModel(
                        "Strikethrough",
                        "Toggle strikethrough Markdown around the current selection.",
                        "Ctrl + Shift + X"),
                    new ShortcutItemViewModel(
                        "Link",
                        "Create or edit a Markdown link for the current selection.",
                        "Ctrl + K"),
                    new ShortcutItemViewModel(
                        "Image",
                        "Create or edit a Markdown image for the current selection.",
                        "Ctrl + Alt + I"),
                    new ShortcutItemViewModel(
                        "Normal text",
                        "Convert the current line back to normal paragraph text.",
                        "Ctrl + N"),
                    new ShortcutItemViewModel(
                        "Heading 1",
                        "Apply the first Markdown heading level.",
                        "Ctrl + 1"),
                    new ShortcutItemViewModel(
                        "Heading 2",
                        "Apply the second Markdown heading level.",
                        "Ctrl + 2"),
                    new ShortcutItemViewModel(
                        "Heading 3",
                        "Apply the third Markdown heading level.",
                        "Ctrl + 3"),
                    new ShortcutItemViewModel(
                        "Heading 4",
                        "Apply the fourth Markdown heading level.",
                        "Ctrl + 4"),
                    new ShortcutItemViewModel(
                        "Heading 5",
                        "Apply the fifth Markdown heading level.",
                        "Ctrl + 5"),
                    new ShortcutItemViewModel(
                        "Heading 6",
                        "Apply the sixth Markdown heading level.",
                        "Ctrl + 6"),
                    new ShortcutItemViewModel(
                        "Confirm toolbar edit",
                        "Apply changes in the toolbar's link or image edit menu.",
                        "Enter"),
                    new ShortcutItemViewModel(
                        "Close toolbar or edit menu",
                        "Dismiss the floating toolbar selection or cancel an open edit menu.",
                        "Esc"),
                }),
            new ShortcutCategoryViewModel(
                "QUICK INSERT MENU",
                new[]
                {
                    new ShortcutItemViewModel(
                        "Open Quick Insert Menu",
                        "Open the Quick Insert Menu at the current editor cursor position.",
                        "Ctrl + Space"),
                    new ShortcutItemViewModel(
                        "Insert and keep menu open",
                        "Insert the selected Quick Insert item and keep the menu open for the next empty line.",
                        "Shift + Left Click"),
                }),
        };
    }

    public IReadOnlyList<ShortcutCategoryViewModel> Categories { get; }
}

public sealed record ShortcutCategoryViewModel(
    string Title,
    IReadOnlyList<ShortcutItemViewModel> Shortcuts);

public sealed class ShortcutItemViewModel : BaseViewModel
{
    private string _shortcut;

    public ShortcutItemViewModel(string title, string description, string shortcut)
    {
        Title = title;
        Description = description;
        _shortcut = shortcut;
    }

    public string Title { get; }

    public string Description { get; }

    public string Shortcut
    {
        get => _shortcut;
        set => SetProperty(ref _shortcut, value);
    }
}
