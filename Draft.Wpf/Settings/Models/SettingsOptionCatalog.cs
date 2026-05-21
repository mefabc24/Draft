namespace Draft.Settings.Models;

public static class SettingsOptionCatalog
{
    public static IReadOnlyList<string> AutosaveIntervalOptions { get; } =
        new[] { "5s", "10s", "30s", "1m", "5m" };

    public static IReadOnlyList<string> DefaultStartupModeOptions { get; } =
        new[] { "Last", "Editor", "Split", "Preview" };

    public static IReadOnlyList<double> WindowMinimumSizeScaleOptions { get; } =
        new[] { 0.5, 0.75, 1.0, 1.25, 1.5 };

    public static IReadOnlyList<string> DefaultFileExtensionOptions { get; } =
        new[] { SettingsDefaults.DefaultFileExtensionDisplay };

    public static IReadOnlyList<string> EditorFontFamilyOptions { get; } =
        new[] { "Cascadia Code", "Cascadia Mono", "Consolas", "JetBrains Mono" };

    public static IReadOnlyList<int> EditorFontSizeOptions { get; } =
        new[] { 12, 14, 16, 18, 20, 22 };

    public static IReadOnlyList<double> LineHeightOptions { get; } =
        new[] { 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2.0, 2.2 };

    public static IReadOnlyList<string> ShowWhitespaceCharactersOptions { get; } =
        new[] { "Always", "Never", "Highlighted Only" };

    public static IReadOnlyList<int> TabSizeOptions { get; } =
        new[] { 2, 4, 6, 8 };

    public static IReadOnlyList<string> CursorStyleOptions { get; } =
        new[] { "Line", "Block", "Underline" };

    public static IReadOnlyList<string> MarkdownThemeOptions =>
        MarkdownPreviewThemeCatalog.ThemeLabels;

    public static IReadOnlyList<string> PreviewScrollSyncModeOptions { get; } =
        new[]
        {
            "Off",
            "Two-way sync",
            "Editor controls preview",
            "Preview controls editor",
            "Follow edited section",
        };

    public static IReadOnlyList<string> FloatingMarkdownToolbarModeOptions { get; } =
        new[] { "Disabled", "Editor", "Preview", "Always" };

    public static IReadOnlyList<string> AppThemeOptions { get; } =
        new[] { "Dark" };

    public static IReadOnlyList<string> WindowBorderAccentModeOptions { get; } =
        new[] { "Disabled", "Always", "Focused only", "Unfocused only" };

    public static IReadOnlyList<string> ToolbarControlbarPositionOptions { get; } =
        new[] { SettingsDefaults.DefaultToolbarPosition };

    public static IReadOnlyList<string> PreviewScrollSyncValues { get; } =
        new[]
        {
            SettingsDefaults.PreviewScrollSyncOff,
            SettingsDefaults.PreviewScrollSyncTwoWay,
            SettingsDefaults.PreviewScrollSyncEditorToPreview,
            SettingsDefaults.PreviewScrollSyncPreviewToEditor,
            SettingsDefaults.PreviewScrollSyncFollowEditedSection,
        };

    public static IReadOnlyList<string> FloatingMarkdownToolbarModeValues { get; } =
        new[]
        {
            SettingsDefaults.FloatingMarkdownToolbarDisabled,
            SettingsDefaults.FloatingMarkdownToolbarEditor,
            SettingsDefaults.FloatingMarkdownToolbarPreview,
            SettingsDefaults.FloatingMarkdownToolbarEditorAndPreview,
        };

    public static IReadOnlyList<string> WindowBorderAccentModeValues { get; } =
        new[]
        {
            SettingsDefaults.WindowBorderAccentDisabled,
            SettingsDefaults.WindowBorderAccentAlways,
            SettingsDefaults.WindowBorderAccentFocusedOnly,
            SettingsDefaults.WindowBorderAccentUnfocusedOnly,
        };
}
