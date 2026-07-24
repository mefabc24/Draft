using System.IO;
using System.Security;
using Draft.Theming;

namespace Draft.Settings.Services;

public static class SettingsDefaults
{
    public const string DefaultAppLanguage = LocalizationService.EnglishLanguageCode;
    public const string DefaultFileExtension = ".md";
    public const string DefaultFileExtensionDisplay = ".md (Markdown)";
    public const string DefaultMarkdownTheme = "Draft Dark";
    public const string DefaultAppTheme = AppThemeCatalog.DefaultTheme;
    public const string DefaultToolbarPosition = "Top";
    public const string PreviewScrollSyncOff = "Off";
    public const string PreviewScrollSyncEditorToPreview = "EditorToPreview";
    public const string PreviewScrollSyncPreviewToEditor = "PreviewToEditor";
    public const string PreviewScrollSyncTwoWay = "TwoWay";
    public const string PreviewScrollSyncFollowEditedSection = "FollowEditedSection";
    public const string DefaultPreviewScrollSyncMode = PreviewScrollSyncTwoWay;
    public const string FloatingMarkdownToolbarDisabled = "Disabled";
    public const string FloatingMarkdownToolbarEditor = "Editor";
    public const string FloatingMarkdownToolbarPreview = "Preview";
    public const string FloatingMarkdownToolbarEditorAndPreview = "EditorAndPreview";
    public const string DefaultFloatingMarkdownToolbarMode = FloatingMarkdownToolbarEditor;
    public const string WindowBorderAccentDisabled = "Disabled";
    public const string WindowBorderAccentAlways = "Always";
    public const string WindowBorderAccentFocusedOnly = "FocusedWindowOnly";
    public const string WindowBorderAccentUnfocusedOnly = "UnfocusedWindowsOnly";
    public const double DefaultWindowMinimumSizeScale = 1.0;

    public static string GetDefaultSaveLocation()
    {
        string documentsPath = GetDocumentsPath();

        try
        {
            return Path.GetFullPath(Path.Combine(documentsPath, "Drafts"));
        }
        catch (Exception ex) when (IsPathException(ex))
        {
            return Path.Combine(documentsPath, "Drafts");
        }
    }

    private static string GetDocumentsPath()
    {
        string documentsPath = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);

        return string.IsNullOrWhiteSpace(documentsPath)
            ? Environment.GetFolderPath(Environment.SpecialFolder.UserProfile)
            : documentsPath;
    }

    private static bool IsPathException(Exception ex)
    {
        return ex is ArgumentException
            or NotSupportedException
            or PathTooLongException
            or SecurityException;
    }
}
