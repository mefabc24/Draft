using System.Windows;

namespace Draft.Theming;

public sealed class AppThemeService
{
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

        ActiveThemeId = theme.Id;
        return theme.Id;
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
            && source.Replace('\\', '/').EndsWith(
                resourcePath,
                StringComparison.OrdinalIgnoreCase);
    }
}
