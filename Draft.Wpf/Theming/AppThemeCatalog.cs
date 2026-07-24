namespace Draft.Theming;

public sealed record AppThemeDefinition(
    string Id,
    string PaletteResourcePath,
    string EditorThemeId);

public static class AppThemeCatalog
{
    public const string Dark = "Dark";
    public const string Light = "Light";
    public const string DefaultTheme = Dark;

    private static readonly IReadOnlyList<AppThemeDefinition> ThemeDefinitions =
        new[]
        {
            new AppThemeDefinition(
                Dark,
                "/Resources/Themes/Dark.xaml",
                "draftDark"),
            new AppThemeDefinition(
                Light,
                "/Resources/Themes/Light.xaml",
                "draftLight"),
        };

    public static IReadOnlyList<AppThemeDefinition> Themes => ThemeDefinitions;

    public static IReadOnlyList<string> ThemeIds { get; } =
        ThemeDefinitions.Select(theme => theme.Id).ToArray();

    public static string Normalize(string? value)
    {
        AppThemeDefinition? theme = Find(value);
        return theme?.Id ?? DefaultTheme;
    }

    public static AppThemeDefinition GetTheme(string? value)
    {
        return Find(value)
            ?? ThemeDefinitions[0];
    }

    public static string GetEditorThemeId(string? value)
    {
        return GetTheme(value).EditorThemeId;
    }

    private static AppThemeDefinition? Find(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        string normalizedValue = value.Trim();

        return ThemeDefinitions.FirstOrDefault(theme =>
            string.Equals(theme.Id, normalizedValue, StringComparison.OrdinalIgnoreCase)
            || string.Equals(
                theme.EditorThemeId,
                normalizedValue,
                StringComparison.OrdinalIgnoreCase));
    }
}
