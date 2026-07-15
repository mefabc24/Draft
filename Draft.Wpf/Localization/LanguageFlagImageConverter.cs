using System.Globalization;
using System.Windows;
using System.Windows.Data;
using System.Windows.Media;

namespace Draft.Localization;

public sealed class LanguageFlagImageConverter : IValueConverter
{
    private const string ResourceKeyPrefix = "Flag.";

    public object? Convert(
        object value,
        Type targetType,
        object parameter,
        CultureInfo culture)
    {
        if (!LanguageCatalog.TryGetLanguage(value?.ToString(), out LanguageMetadata language)
            || string.IsNullOrWhiteSpace(language.Flag))
        {
            return null;
        }

        string flagName = language.Flag.Trim();

        if (flagName.EndsWith(".svg", StringComparison.OrdinalIgnoreCase))
            flagName = flagName[..^4];

        return Application.Current?.TryFindResource($"{ResourceKeyPrefix}{flagName.ToLowerInvariant()}")
            as ImageSource;
    }

    public object ConvertBack(
        object value,
        Type targetType,
        object parameter,
        CultureInfo culture)
    {
        throw new NotSupportedException();
    }
}
