using System.IO;
using System.Text.Json;

namespace Draft.Localization;

public static class LocalizationService
{
    public const string EnglishLanguageCode = "en";
    public const string SystemLanguageValue = "System";
    public const string EnglishLanguageValue = "English";

    private const string LocalizationDirectoryName = "Localization";
    private static readonly object DictionariesLock = new();
    private static readonly Dictionary<string, IReadOnlyDictionary<string, string>> Dictionaries =
        new(StringComparer.OrdinalIgnoreCase);
    private static string _currentAppLanguage = SystemLanguageValue;

    public static string CurrentAppLanguage => _currentAppLanguage;

    public static void SetCurrentAppLanguage(string? appLanguage)
    {
        string nextAppLanguage = string.IsNullOrWhiteSpace(appLanguage)
            ? SystemLanguageValue
            : appLanguage.Trim();

        if (string.Equals(_currentAppLanguage, nextAppLanguage, StringComparison.Ordinal))
            return;

        _currentAppLanguage = nextAppLanguage;
        LocalizationBindingSource.Current.Refresh();
    }

    public static string ResolveLanguageCode(string? appLanguage)
    {
        if (string.IsNullOrWhiteSpace(appLanguage))
            return EnglishLanguageCode;

        string normalizedLanguage = appLanguage.Trim();

        return normalizedLanguage switch
        {
            SystemLanguageValue => EnglishLanguageCode,
            EnglishLanguageValue => EnglishLanguageCode,
            EnglishLanguageCode => EnglishLanguageCode,
            _ => normalizedLanguage.ToLowerInvariant(),
        };
    }

    public static string Translate(string key, string? fallback = null, string? appLanguage = null)
    {
        if (string.IsNullOrWhiteSpace(key))
            return fallback ?? string.Empty;

        string languageCode = ResolveLanguageCode(appLanguage ?? CurrentAppLanguage);

        if (TryTranslate(languageCode, key, out string? localizedText))
            return localizedText;

        if (!string.Equals(languageCode, EnglishLanguageCode, StringComparison.OrdinalIgnoreCase)
            && TryTranslate(EnglishLanguageCode, key, out localizedText))
        {
            return localizedText;
        }

        return fallback ?? key;
    }

    public static string TranslateFormat(
        string key,
        string fallback,
        IReadOnlyDictionary<string, string> parameters,
        string? appLanguage = null)
    {
        string localizedText = Translate(key, fallback, appLanguage);

        foreach ((string parameterName, string value) in parameters)
        {
            localizedText = localizedText.Replace(
                $"{{{parameterName}}}",
                value,
                StringComparison.Ordinal);
        }

        return localizedText;
    }

    private static bool TryTranslate(string languageCode, string key, out string value)
    {
        IReadOnlyDictionary<string, string> dictionary = LoadDictionary(languageCode);

        if (dictionary.TryGetValue(key, out string? localizedText)
            && !string.IsNullOrWhiteSpace(localizedText))
        {
            value = localizedText;
            return true;
        }

        value = string.Empty;
        return false;
    }

    private static IReadOnlyDictionary<string, string> LoadDictionary(string languageCode)
    {
        lock (DictionariesLock)
        {
            if (Dictionaries.TryGetValue(languageCode, out IReadOnlyDictionary<string, string>? dictionary))
                return dictionary;

            dictionary = ReadDictionary(languageCode);
            Dictionaries[languageCode] = dictionary;

            return dictionary;
        }
    }

    private static IReadOnlyDictionary<string, string> ReadDictionary(string languageCode)
    {
        string path = Path.Combine(
            AppContext.BaseDirectory,
            "Resources",
            LocalizationDirectoryName,
            $"{languageCode}.json");

        if (!File.Exists(path))
            return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        try
        {
            string json = File.ReadAllText(path);
            Dictionary<string, string>? dictionary =
                JsonSerializer.Deserialize<Dictionary<string, string>>(json);

            return dictionary is null
                ? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
                : new Dictionary<string, string>(dictionary, StringComparer.OrdinalIgnoreCase);
        }
        catch (Exception ex) when (ex is IOException
            or UnauthorizedAccessException
            or NotSupportedException
            or JsonException)
        {
            return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        }
    }
}
