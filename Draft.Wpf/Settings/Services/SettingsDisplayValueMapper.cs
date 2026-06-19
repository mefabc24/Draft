namespace Draft.Settings.Services;

public static class SettingsDisplayValueMapper
{
    public static string GetWindowBorderAccentModeValue(string displayName)
    {
        return displayName switch
        {
            "Always" => SettingsDefaults.WindowBorderAccentAlways,
            "Focused only" => SettingsDefaults.WindowBorderAccentFocusedOnly,
            "Focused window only" => SettingsDefaults.WindowBorderAccentFocusedOnly,
            "Unfocused only" => SettingsDefaults.WindowBorderAccentUnfocusedOnly,
            "Unfocused windows only" => SettingsDefaults.WindowBorderAccentUnfocusedOnly,
            _ => SettingsDefaults.WindowBorderAccentDisabled,
        };
    }

    public static string GetWindowBorderAccentModeDisplayName(string value)
    {
        return value switch
        {
            SettingsDefaults.WindowBorderAccentAlways => "Always",
            SettingsDefaults.WindowBorderAccentFocusedOnly => "Focused only",
            SettingsDefaults.WindowBorderAccentUnfocusedOnly => "Unfocused only",
            _ => "Disabled",
        };
    }

    public static string GetPreviewScrollSyncValue(string displayName)
    {
        return displayName switch
        {
            "Two-way sync" => SettingsDefaults.PreviewScrollSyncTwoWay,
            "Editor controls preview" => SettingsDefaults.PreviewScrollSyncEditorToPreview,
            "Preview controls editor" => SettingsDefaults.PreviewScrollSyncPreviewToEditor,
            "Follow edited section" => SettingsDefaults.PreviewScrollSyncFollowEditedSection,
            _ => SettingsDefaults.PreviewScrollSyncOff,
        };
    }

    public static string GetPreviewScrollSyncDisplayName(string value)
    {
        return value switch
        {
            SettingsDefaults.PreviewScrollSyncTwoWay => "Two-way sync",
            SettingsDefaults.PreviewScrollSyncEditorToPreview => "Editor controls preview",
            SettingsDefaults.PreviewScrollSyncPreviewToEditor => "Preview controls editor",
            SettingsDefaults.PreviewScrollSyncFollowEditedSection => "Follow edited section",
            _ => "Off",
        };
    }

    public static string GetFloatingMarkdownToolbarModeValue(string displayName)
    {
        return displayName switch
        {
            "Editor" => SettingsDefaults.FloatingMarkdownToolbarEditor,
            "Always" => SettingsDefaults.FloatingMarkdownToolbarEditor,
            _ => SettingsDefaults.FloatingMarkdownToolbarDisabled,
        };
    }

    public static string GetFloatingMarkdownToolbarModeDisplayName(string value)
    {
        return value switch
        {
            SettingsDefaults.FloatingMarkdownToolbarEditor => "Editor",
            SettingsDefaults.FloatingMarkdownToolbarEditorAndPreview => "Editor",
            _ => "Disabled",
        };
    }

    public static string GetDefaultFileExtensionValue(string displayName)
    {
        return displayName == SettingsDefaults.DefaultFileExtensionDisplay
            ? SettingsDefaults.DefaultFileExtension
            : SettingsDefaults.DefaultFileExtension;
    }

    public static string GetDefaultFileExtensionDisplayName(string value)
    {
        return value == SettingsDefaults.DefaultFileExtension
            ? SettingsDefaults.DefaultFileExtensionDisplay
            : SettingsDefaults.DefaultFileExtensionDisplay;
    }
}
