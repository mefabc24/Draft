using System.Globalization;
using System.Windows.Data;

namespace Draft.Localization;

public sealed class LocalizedDisplayValueConverter : IMultiValueConverter
{
    private static readonly IReadOnlyDictionary<string, string> LocalizationKeys =
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            [".md (Markdown)"] = "settings.options.fileExtension.markdown",
            ["Always"] = "settings.options.common.always",
            ["Block"] = "settings.options.cursor.block",
            ["Both"] = "settings.options.common.both",
            ["Dark"] = "settings.options.theme.dark",
            ["Disabled"] = "settings.options.common.disabled",
            ["Editor"] = "settings.options.workspace.editor",
            ["EditorAndPreview"] = "settings.options.common.both",
            ["Editor controls preview"] = "settings.options.scrollSync.editorControlsPreview",
            ["Follow edited section"] = "settings.options.scrollSync.followEditedSection",
            ["Highlighted Only"] = "settings.options.whitespace.highlightedOnly",
            ["Last"] = "settings.options.startup.last",
            ["Light"] = "settings.options.theme.light",
            ["Line"] = "settings.options.cursor.line",
            ["Never"] = "settings.options.common.never",
            ["Off"] = "settings.options.common.off",
            ["Overflow"] = "settings.options.menuItem.overflow",
            ["Preview"] = "settings.options.workspace.preview",
            ["Preview controls editor"] = "settings.options.scrollSync.previewControlsEditor",
            ["Split"] = "settings.options.workspace.split",
            ["Top"] = "settings.options.position.top",
            ["Two-way sync"] = "settings.options.scrollSync.twoWay",
            ["Underline"] = "settings.options.cursor.underline",
            ["Unfocused only"] = "settings.options.windowBorder.unfocusedOnly",
            ["Focused only"] = "settings.options.windowBorder.focusedOnly",
            ["Visible"] = "settings.options.menuItem.visible",
        };

    public object Convert(
        object[] values,
        Type targetType,
        object parameter,
        CultureInfo culture)
    {
        if (values.Length == 0 || values[0] is null)
            return string.Empty;

        object value = values[0];

        if (value is double doubleValue)
            return doubleValue.ToString("0.0#", culture);

        if (value is IFormattable formattable && value is not string)
            return formattable.ToString(null, culture);

        string fallback = value.ToString() ?? string.Empty;

        string normalizedLanguageValue = LocalizationService.NormalizeAppLanguageValue(fallback);

        if (LanguageCatalog.TryGetLanguage(normalizedLanguageValue, out LanguageMetadata language))
            return language.DisplayName;

        return LocalizationKeys.TryGetValue(fallback, out string? key)
            ? LocalizationService.Translate(key, fallback)
            : fallback;
    }

    public object[] ConvertBack(
        object value,
        Type[] targetTypes,
        object parameter,
        CultureInfo culture)
    {
        throw new NotSupportedException();
    }
}
