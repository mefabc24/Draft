using System.IO;
using System.Security;
using System.Text.Json;

namespace Draft.Helpers;

public sealed class DraftSettings
{
    public bool ReopenLastWorkspaceOnStartup { get; set; } = false;

    public bool AutosaveEnabled { get; set; } = false;

    public string AutosaveInterval { get; set; } = "10s";

    public bool SaveOnFocusLost { get; set; } = false;

    public bool ConfirmBeforeClosingUnsavedFiles { get; set; } = true;

    public string DefaultStartupMode { get; set; } = "Last";

    public string DefaultSaveLocation { get; set; } = string.Empty;

    public string DefaultFileExtension { get; set; } = ".md";

    public string EditorFontFamily { get; set; } = "JetBrains Mono";

    public int EditorFontSize { get; set; } = 18;

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

    public string MarkdownTheme { get; set; } = "Default";

    public bool OpenLinksInBrowser { get; set; } = true;

    public bool ConfirmBeforeOpeningExternalLinks { get; set; } = false;

    public bool SyncScrollWithEditor { get; set; } = false;

    public bool ScrollPreviewToEditedSection { get; set; } = false;

    public string AppTheme { get; set; } = "Dark";

    public bool IsStatusBarVisible { get; set; } = true;

    public string ToolbarControlbarPosition { get; set; } = "Top";
}

public static class AppSettingsStore
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
    };

    private static readonly string SettingsFilePath = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "Draft",
        "settings.json");

    public static DraftSettings Load()
    {
        try
        {
            if (!File.Exists(SettingsFilePath))
                return new DraftSettings();

            string json = File.ReadAllText(SettingsFilePath);
            return JsonSerializer.Deserialize<DraftSettings>(json, JsonOptions) ?? new DraftSettings();
        }
        catch (Exception ex) when (IsPersistenceException(ex))
        {
            return new DraftSettings();
        }
    }

    public static bool TrySave(DraftSettings settings)
    {
        try
        {
            string? directoryPath = Path.GetDirectoryName(SettingsFilePath);

            if (!string.IsNullOrWhiteSpace(directoryPath))
            {
                Directory.CreateDirectory(directoryPath);
            }

            string json = JsonSerializer.Serialize(settings, JsonOptions);
            File.WriteAllText(SettingsFilePath, json);

            return true;
        }
        catch (Exception ex) when (IsPersistenceException(ex))
        {
            return false;
        }
    }

    private static bool IsPersistenceException(Exception ex)
    {
        return ex is IOException
            or UnauthorizedAccessException
            or NotSupportedException
            or SecurityException
            or JsonException;
    }
}
