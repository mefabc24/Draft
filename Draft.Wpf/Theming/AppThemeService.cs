using System.Windows;
using System.Windows.Media;

namespace Draft.Theming;

public sealed class AppThemeService
{
    private static readonly IReadOnlyDictionary<string, string> LegacyBrushColorKeys =
        new Dictionary<string, string>
        {
            ["Brush.PrimaryAccent"] = "Color.Accent.Primary",
            ["Brush.SecondaryAccent"] = "Color.Accent.Secondary",
            ["Brush.WindowBG"] = "Color.Background.Window",
            ["Brush.Island"] = "Color.Background.Surface",
            ["Brush.EditorHighlight"] = "Color.Border.Subtle",
            ["Brush.Outline"] = "Color.Border.Subtle",
            ["Brush.ButtonHover"] = "Color.Background.Hover",
            ["Brush.ButtonActive"] = "Color.Background.Hover",
            ["Brush.PrimaryText"] = "Color.Text.Tertiary",
            ["Brush.MutedText"] = "Color.Text.Muted",
            ["Brush.EditorText"] = "Color.Text.Editor",
            ["Brush.Success"] = "Color.Function.Success",
            ["Brush.Warning"] = "Color.Function.Warning",
            ["Brush.Critical"] = "Color.Function.Critical",
            ["Brush.Info"] = "Color.Function.Info",
            ["Brush.WindowControlIcon"] = "Color.Icon.Default",
            ["Brush.CloseButtonBackground"] =
                "Color.Background.WindowControlClose",
        };

    public static AppThemeService Current { get; } = new();

    private AppThemeService()
    {
    }

    public string ActiveThemeId { get; private set; } = AppThemeCatalog.DefaultTheme;

    public string Apply(string? requestedTheme)
    {
        string normalizedTheme = AppThemeCatalog.Normalize(requestedTheme);
        Application? application = Application.Current;

        if (application is null)
        {
            ActiveThemeId = normalizedTheme;
            return normalizedTheme;
        }

        if (!application.Dispatcher.CheckAccess())
        {
            return application.Dispatcher.Invoke(() => Apply(normalizedTheme));
        }

        AppThemeDefinition theme = AppThemeCatalog.GetTheme(normalizedTheme);
        ResourceDictionary palette = new()
        {
            Source = new Uri(theme.PaletteResourcePath, UriKind.Relative),
        };

        IList<ResourceDictionary> dictionaries =
            application.Resources.MergedDictionaries;
        int paletteIndex = FindPaletteIndex(dictionaries);

        if (paletteIndex >= 0)
        {
            if (!HasSource(dictionaries[paletteIndex], theme.PaletteResourcePath))
            {
                dictionaries[paletteIndex] = palette;
            }
        }
        else
        {
            dictionaries.Insert(0, palette);
        }

        UpdateBrushColors(application, palette);
        ActiveThemeId = theme.Id;
        return theme.Id;
    }

    private static void UpdateBrushColors(
        Application application,
        ResourceDictionary palette)
    {
        foreach (object key in palette.Keys)
        {
            if (key is not string colorKey
                || !colorKey.StartsWith("Color.", StringComparison.Ordinal)
                || palette[colorKey] is not Color color)
            {
                continue;
            }

            string brushKey = $"Brush.{colorKey["Color.".Length..]}";
            UpdateBrushColor(application, brushKey, color);
        }

        foreach ((string brushKey, string colorKey) in LegacyBrushColorKeys)
        {
            if (palette[colorKey] is Color color)
            {
                UpdateBrushColor(application, brushKey, color);
            }
        }
    }

    private static void UpdateBrushColor(
        Application application,
        string brushKey,
        Color color)
    {
        if (application.TryFindResource(brushKey) is SolidColorBrush brush
            && !brush.IsFrozen)
        {
            brush.Color = color;
        }
    }

    private static int FindPaletteIndex(IList<ResourceDictionary> dictionaries)
    {
        for (int index = 0; index < dictionaries.Count; index++)
        {
            ResourceDictionary dictionary = dictionaries[index];

            if (AppThemeCatalog.Themes.Any(theme =>
                HasSource(dictionary, theme.PaletteResourcePath)))
            {
                return index;
            }
        }

        return -1;
    }

    private static bool HasSource(ResourceDictionary dictionary, string resourcePath)
    {
        string? source = dictionary.Source?.OriginalString;

        return source is not null
            && source.Replace('\\', '/').TrimStart('/').EndsWith(
                resourcePath.Replace('\\', '/').TrimStart('/'),
                StringComparison.OrdinalIgnoreCase);
    }
}
