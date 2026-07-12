using System.IO;
using System.Text.Json;

namespace Draft.Localization;

public static class LanguageCatalog
{
    private const string LocalizationDirectoryName = "Localization";
    private const string ResourcesDirectoryName = "Resources";
    private static readonly object LanguagesLock = new();
    private static IReadOnlyList<LanguageMetadata>? _availableLanguages;

    public static IReadOnlyList<LanguageMetadata> AvailableLanguages
    {
        get
        {
            lock (LanguagesLock)
            {
                _availableLanguages ??= LoadAvailableLanguages();
                return _availableLanguages;
            }
        }
    }

    public static IReadOnlyList<string> AppLanguageOptionValues =>
        new[] { LocalizationService.SystemLanguageValue }
            .Concat(AvailableLanguages.Select(language => language.Code))
            .ToArray();

    public static bool IsSupportedAppLanguage(string? value)
    {
        string normalizedValue = LocalizationService.NormalizeAppLanguageValue(value);

        return string.Equals(
                normalizedValue,
                LocalizationService.SystemLanguageValue,
                StringComparison.OrdinalIgnoreCase)
            || AvailableLanguages.Any(language => string.Equals(
                language.Code,
                normalizedValue,
                StringComparison.OrdinalIgnoreCase));
    }

    public static bool TryGetLanguage(string? code, out LanguageMetadata language)
    {
        string normalizedCode = LocalizationService.NormalizeLanguageCode(code);

        foreach (LanguageMetadata availableLanguage in AvailableLanguages)
        {
            if (string.Equals(
                availableLanguage.Code,
                normalizedCode,
                StringComparison.OrdinalIgnoreCase))
            {
                language = availableLanguage;
                return true;
            }
        }

        language = CreateEnglishFallback();
        return false;
    }

    private static IReadOnlyList<LanguageMetadata> LoadAvailableLanguages()
    {
        string directoryPath = Path.Combine(
            AppContext.BaseDirectory,
            ResourcesDirectoryName,
            LocalizationDirectoryName);

        IEnumerable<LanguageMetadata> languages = Directory.Exists(directoryPath)
            ? Directory
                .EnumerateFiles(directoryPath, "*.json")
                .Select(ReadLanguageMetadata)
                .Where(language => language is not null)
                .Cast<LanguageMetadata>()
            : Enumerable.Empty<LanguageMetadata>();

        List<LanguageMetadata> sortedLanguages = languages
            .GroupBy(language => language.Code, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.First())
            .OrderBy(language => language.DisplayName, StringComparer.CurrentCultureIgnoreCase)
            .ToList();

        if (sortedLanguages.All(language => !string.Equals(
            language.Code,
            LocalizationService.EnglishLanguageCode,
            StringComparison.OrdinalIgnoreCase)))
        {
            sortedLanguages.Insert(0, CreateEnglishFallback());
        }

        return sortedLanguages;
    }

    private static LanguageMetadata? ReadLanguageMetadata(string path)
    {
        try
        {
            using FileStream stream = File.OpenRead(path);
            using JsonDocument document = JsonDocument.Parse(stream);

            string fallbackCode = Path.GetFileNameWithoutExtension(path);

            if (!document.RootElement.TryGetProperty("meta", out JsonElement metaElement)
                || metaElement.ValueKind != JsonValueKind.Object)
            {
                return new LanguageMetadata(
                    LocalizationService.NormalizeLanguageCode(fallbackCode),
                    fallbackCode.ToUpperInvariant(),
                    fallbackCode,
                    fallbackCode,
                    null);
            }

            string code = ReadString(metaElement, "code", fallbackCode);
            string normalizedCode = LocalizationService.NormalizeLanguageCode(code);
            string displayName = ReadString(metaElement, "displayName", normalizedCode);

            return new LanguageMetadata(
                normalizedCode,
                ReadString(metaElement, "shortName", normalizedCode.ToUpperInvariant()),
                displayName,
                ReadString(metaElement, "englishName", displayName),
                ReadOptionalString(metaElement, "flag"));
        }
        catch (Exception ex) when (ex is IOException
            or UnauthorizedAccessException
            or NotSupportedException
            or JsonException)
        {
            return null;
        }
    }

    private static LanguageMetadata CreateEnglishFallback()
        => new(
            LocalizationService.EnglishLanguageCode,
            "EN",
            "English",
            "English",
            null);

    private static string ReadString(JsonElement element, string name, string fallback)
        => ReadOptionalString(element, name) ?? fallback;

    private static string? ReadOptionalString(JsonElement element, string name)
    {
        return element.TryGetProperty(name, out JsonElement valueElement)
            && valueElement.ValueKind == JsonValueKind.String
            ? valueElement.GetString()
            : null;
    }
}
