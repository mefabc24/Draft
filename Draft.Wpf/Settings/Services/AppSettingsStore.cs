using System.IO;
using System.Security;
using Draft.Settings.Models;
using Draft.Settings.Shortcuts;
using System.Text.Json;

namespace Draft.Settings.Services;

public static class AppSettingsStore
{
    public const string AppLanguageSystem = SettingsDefaults.AppLanguageSystem;
    public const string AppLanguageEnglish = SettingsDefaults.AppLanguageEnglish;
    public const string DefaultAppLanguage = SettingsDefaults.DefaultAppLanguage;
    public const string DefaultFileExtension = ".md";
    public const string DefaultFileExtensionDisplay = ".md (Markdown)";
    public const string DefaultMarkdownTheme = SettingsDefaults.DefaultMarkdownTheme;
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

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
    };

    private static readonly string SettingsFilePath = AppDataPaths.SettingsFilePath;

    public static DraftSettings Load()
    {
        try
        {
            if (!File.Exists(SettingsFilePath))
                return CreateDefaultSettings();

            string json = File.ReadAllText(SettingsFilePath);
            using JsonDocument document = JsonDocument.Parse(json);
            DraftSettings settings = JsonSerializer.Deserialize<DraftSettings>(json, JsonOptions)
                ?? CreateDefaultSettings();

            bool hasPreviewScrollSyncMode = TryGetStringProperty(
                document.RootElement,
                nameof(DraftSettings.PreviewScrollSyncMode),
                out _);
            bool? legacySyncScrollWithEditor = TryGetBooleanProperty(
                document.RootElement,
                "SyncScrollWithEditor",
                out bool syncScrollWithEditor)
                    ? syncScrollWithEditor
                    : null;

            return Normalize(settings, hasPreviewScrollSyncMode, legacySyncScrollWithEditor);
        }
        catch (Exception ex) when (IsPersistenceException(ex))
        {
            return CreateDefaultSettings();
        }
    }

    public static bool TrySave(DraftSettings settings)
    {
        try
        {
            Normalize(settings);

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

    public static DraftSettings CreateDefaultSettings()
    {
        return Normalize(new DraftSettings());
    }

    public static DraftSettings Normalize(
        DraftSettings settings,
        bool hasPreviewScrollSyncMode = true,
        bool? legacySyncScrollWithEditor = null)
    {
        settings.AppLanguage = NormalizeAppLanguage(settings.AppLanguage);
        settings.DefaultSaveLocation = NormalizeSaveLocation(settings.DefaultSaveLocation);
        settings.DefaultFileExtension = DefaultFileExtension;
        settings.MarkdownTheme = MarkdownPreviewThemeCatalog.GetThemeLabel(settings.MarkdownTheme);
        settings.ToolbarControlbarPosition = DefaultToolbarPosition;
        settings.Shortcuts = ShortcutSettingsCatalog.Normalize(settings.Shortcuts);
        settings.WindowBorderAccentMode = IsWindowBorderAccentMode(settings.WindowBorderAccentMode)
            ? settings.WindowBorderAccentMode
            : WindowBorderAccentDisabled;
        settings.WindowMinimumSizeScale = IsWindowMinimumSizeScale(settings.WindowMinimumSizeScale)
            ? settings.WindowMinimumSizeScale
            : DefaultWindowMinimumSizeScale;

        if (!hasPreviewScrollSyncMode && legacySyncScrollWithEditor.HasValue)
        {
            settings.PreviewScrollSyncMode = legacySyncScrollWithEditor.Value
                ? PreviewScrollSyncTwoWay
                : PreviewScrollSyncOff;
        }
        else
        {
            settings.PreviewScrollSyncMode = IsPreviewScrollSyncMode(settings.PreviewScrollSyncMode)
                ? settings.PreviewScrollSyncMode
                : DefaultPreviewScrollSyncMode;
        }

        if (settings.ScrollPreviewToEditedSection)
        {
            settings.PreviewScrollSyncMode = PreviewScrollSyncFollowEditedSection;
            settings.ScrollPreviewToEditedSection = false;
        }

        settings.FloatingMarkdownToolbarMode = NormalizeFloatingMarkdownToolbarMode(
            settings.FloatingMarkdownToolbarMode);

        TryEnsureDefaultSaveLocationDirectory(settings.DefaultSaveLocation);

        return settings;
    }

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

    public static string ToFriendlyDocumentsPath(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
            return string.Empty;

        string documentsPath = GetDocumentsPath();

        try
        {
            string fullPath = Path.GetFullPath(path);
            string fullDocumentsPath = Path.GetFullPath(documentsPath).TrimEnd(
                Path.DirectorySeparatorChar,
                Path.AltDirectorySeparatorChar);

            if (string.Equals(fullPath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar),
                fullDocumentsPath,
                StringComparison.OrdinalIgnoreCase))
            {
                return "~/Documents";
            }

            string documentsPrefix = fullDocumentsPath + Path.DirectorySeparatorChar;

            if (fullPath.StartsWith(documentsPrefix, StringComparison.OrdinalIgnoreCase))
            {
                string relativePath = fullPath[documentsPrefix.Length..]
                    .Replace(Path.DirectorySeparatorChar, '/')
                    .Replace(Path.AltDirectorySeparatorChar, '/');

                return $"~/Documents/{relativePath}";
            }
        }
        catch (Exception ex) when (IsPathException(ex))
        {
            return path;
        }

        return path;
    }

    public static string ExpandFriendlyDocumentsPath(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        string trimmedValue = value.Trim();
        string normalizedValue = trimmedValue.Replace('\\', '/');
        const string documentsPrefix = "~/Documents";

        if (!normalizedValue.Equals(documentsPrefix, StringComparison.OrdinalIgnoreCase)
            && !normalizedValue.StartsWith($"{documentsPrefix}/", StringComparison.OrdinalIgnoreCase))
        {
            return trimmedValue;
        }

        string relativePath = normalizedValue.Length == documentsPrefix.Length
            ? string.Empty
            : normalizedValue[(documentsPrefix.Length + 1)..];

        return Path.Combine(GetDocumentsPath(), relativePath.Replace('/', Path.DirectorySeparatorChar));
    }

    private static string NormalizeSaveLocation(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
            return GetDefaultSaveLocation();

        string expandedPath = ExpandFriendlyDocumentsPath(path);

        try
        {
            return Path.GetFullPath(expandedPath);
        }
        catch (Exception ex) when (IsPathException(ex))
        {
            return expandedPath;
        }
    }

    private static string GetDocumentsPath()
    {
        string documentsPath = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);

        if (!string.IsNullOrWhiteSpace(documentsPath))
            return documentsPath;

        string userProfilePath = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);

        return string.IsNullOrWhiteSpace(userProfilePath)
            ? "Documents"
            : Path.Combine(userProfilePath, "Documents");
    }

    private static void TryEnsureDefaultSaveLocationDirectory(string path)
    {
        if (!string.Equals(
            NormalizePathForComparison(path),
            NormalizePathForComparison(GetDefaultSaveLocation()),
            StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        try
        {
            Directory.CreateDirectory(path);
        }
        catch (Exception ex) when (IsPersistenceException(ex) || IsPathException(ex))
        {
        }
    }

    private static string NormalizePathForComparison(string path)
    {
        try
        {
            return Path.GetFullPath(path).TrimEnd(
                Path.DirectorySeparatorChar,
                Path.AltDirectorySeparatorChar);
        }
        catch (Exception ex) when (IsPathException(ex))
        {
            return path.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        }
    }

    private static bool IsPreviewScrollSyncMode(string value)
    {
        return value is PreviewScrollSyncOff
            or PreviewScrollSyncEditorToPreview
            or PreviewScrollSyncPreviewToEditor
            or PreviewScrollSyncTwoWay
            or PreviewScrollSyncFollowEditedSection;
    }

    private static string NormalizeFloatingMarkdownToolbarMode(string value)
    {
        return SettingsDisplayValueMapper.NormalizeFloatingMarkdownToolbarMode(
            value,
            DefaultFloatingMarkdownToolbarMode);
    }

    private static bool IsWindowMinimumSizeScale(double value)
    {
        return value is 0.5
            or 0.75
            or DefaultWindowMinimumSizeScale
            or 1.25
            or 1.5;
    }

    private static bool IsWindowBorderAccentMode(string value)
    {
        return value is WindowBorderAccentDisabled
            or WindowBorderAccentAlways
            or WindowBorderAccentFocusedOnly
            or WindowBorderAccentUnfocusedOnly;
    }

    private static string NormalizeAppLanguage(string? value)
    {
        string normalizedValue = LocalizationService.NormalizeAppLanguageValue(value);

        return LanguageCatalog.IsSupportedAppLanguage(normalizedValue)
            ? normalizedValue
            : DefaultAppLanguage;
    }

    private static bool TryGetStringProperty(JsonElement root, string name, out string? value)
    {
        foreach (JsonProperty property in root.EnumerateObject())
        {
            if (string.Equals(property.Name, name, StringComparison.OrdinalIgnoreCase)
                && property.Value.ValueKind == JsonValueKind.String)
            {
                value = property.Value.GetString();
                return true;
            }
        }

        value = null;
        return false;
    }

    private static bool TryGetBooleanProperty(JsonElement root, string name, out bool value)
    {
        foreach (JsonProperty property in root.EnumerateObject())
        {
            if (string.Equals(property.Name, name, StringComparison.OrdinalIgnoreCase)
                && (property.Value.ValueKind == JsonValueKind.True
                    || property.Value.ValueKind == JsonValueKind.False))
            {
                value = property.Value.GetBoolean();
                return true;
            }
        }

        value = false;
        return false;
    }

    private static bool IsPersistenceException(Exception ex)
    {
        return ex is IOException
            or UnauthorizedAccessException
            or NotSupportedException
            or SecurityException
            or JsonException;
    }

    private static bool IsPathException(Exception ex)
    {
        return ex is ArgumentException
            or NotSupportedException
            or PathTooLongException
            or SecurityException;
    }
}
