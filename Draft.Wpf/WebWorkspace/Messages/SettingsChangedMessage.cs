using Draft.Settings.Models;

namespace Draft.WebWorkspace.Messages;

public sealed record SettingsChangedMessage(
    string Type,
    string AppLanguage,
    string ActiveEditorThemeId,
    string ActivePreviewThemeId,
    string EditorFontFamily,
    int EditorFontSize,
    double LineHeight,
    bool WordWrap,
    bool ShowLineNumbers,
    bool HighlightCurrentLine,
    string ShowWhitespaceCharacters,
    bool ShowIndentationGuides,
    int TabSize,
    bool InsertSpacesInsteadOfTabs,
    bool AutoPairBrackets,
    bool AutoPairQuotes,
    bool MarkdownSyntaxHighlighting,
    string CursorStyle,
    bool CursorBlinking,
    string PreviewScrollSyncMode,
    string FloatingMarkdownToolbarMode,
    IReadOnlyList<MenuItemCustomization> FloatingMarkdownToolbarItems,
    IReadOnlyList<MenuItemCustomization> QuickInsertItems,
    IReadOnlyDictionary<string, string> Shortcuts);
