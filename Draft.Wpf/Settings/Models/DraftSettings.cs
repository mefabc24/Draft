using Draft.Settings.Services;

namespace Draft.Settings.Models;

public sealed class DraftSettings
{
    public bool ReopenLastWorkspaceOnStartup { get; set; } = false;

    public bool CheckForUpdatesOnStartup { get; set; } = true;

    public bool AutosaveEnabled { get; set; } = false;

    public string AutosaveInterval { get; set; } = "10s";

    public bool SaveOnFocusLost { get; set; } = false;

    public bool IncludeMarkdownSyntaxInCharacterCount { get; set; } = false;

    public bool ConfirmBeforeClosingUnsavedFiles { get; set; } = true;

    public string DefaultStartupMode { get; set; } = "Last";

    public double WindowMinimumSizeScale { get; set; } = SettingsDefaults.DefaultWindowMinimumSizeScale;

    public string DefaultSaveLocation { get; set; } = SettingsDefaults.GetDefaultSaveLocation();

    public string DefaultFileExtension { get; set; } = SettingsDefaults.DefaultFileExtension;

    public bool AssociateTxtFilesWithDraft { get; set; } = false;

    public string EditorFontFamily { get; set; } = "JetBrains Mono";

    public int EditorFontSize { get; set; } = 16;

    public double LineHeight { get; set; } = 1.6;

    public bool WordWrap { get; set; } = true;

    public bool ShowLineNumbers { get; set; } = true;

    public bool HighlightCurrentLine { get; set; } = true;

    public string ShowWhitespaceCharacters { get; set; } = "Never";

    public bool ShowIndentationGuides { get; set; } = false;

    public int TabSize { get; set; } = 4;

    public bool InsertSpacesInsteadOfTabs { get; set; } = true;

    public bool AutoPairBrackets { get; set; } = true;

    public bool AutoPairQuotes { get; set; } = true;

    public bool MarkdownSyntaxHighlighting { get; set; } = true;

    public string CursorStyle { get; set; } = "Line";

    public bool CursorBlinking { get; set; } = true;

    public string MarkdownTheme { get; set; } = SettingsDefaults.DefaultMarkdownTheme;

    public bool ConfirmBeforeOpeningExternalLinks { get; set; } = true;

    public string PreviewScrollSyncMode { get; set; } = SettingsDefaults.DefaultPreviewScrollSyncMode;

    public string FloatingMarkdownToolbarMode { get; set; } = SettingsDefaults.DefaultFloatingMarkdownToolbarMode;

    public bool ScrollPreviewToEditedSection { get; set; } = false;

    public string AppTheme { get; set; } = "Dark";

    public bool IsStatusBarVisible { get; set; } = true;

    public string WindowBorderAccentMode { get; set; } = SettingsDefaults.WindowBorderAccentDisabled;

    public string ToolbarControlbarPosition { get; set; } = "Top";
}
