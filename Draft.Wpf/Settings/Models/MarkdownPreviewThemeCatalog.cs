using System.IO;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Draft.Settings.Models;

public static class MarkdownPreviewThemeCatalog
{
    private const string DefaultThemeId = "draftDark";
    private const string ThemeManifestFileName = "preview-theme-options.json";

    private static readonly Regex ThemeIdRegex = new(@"id:\s*['""](?<id>[^'""]+)['""]", RegexOptions.Compiled);
    private static readonly Regex ThemeLabelRegex = new(@"label:\s*['""](?<label>[^'""]+)['""]", RegexOptions.Compiled);
    private static readonly JsonSerializerOptions ThemeManifestJsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private static readonly IReadOnlyList<MarkdownPreviewThemeOption> FallbackThemeOptions =
        new[]
        {
            new MarkdownPreviewThemeOption(DefaultThemeId, SettingsDefaults.DefaultMarkdownTheme),
        };

    public static IReadOnlyList<MarkdownPreviewThemeOption> ThemeOptions { get; } =
        LoadThemeOptions();

    public static IReadOnlyList<string> ThemeLabels { get; } =
        ThemeOptions.Select(option => option.Label).ToArray();

    public static string GetThemeId(string value)
    {
        return FindThemeOption(value)?.Id ?? DefaultThemeId;
    }

    public static string GetThemeLabel(string value)
    {
        return FindThemeOption(value)?.Label ?? SettingsDefaults.DefaultMarkdownTheme;
    }

    private static MarkdownPreviewThemeOption? FindThemeOption(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        return ThemeOptions.FirstOrDefault(option =>
            string.Equals(option.Id, value, StringComparison.OrdinalIgnoreCase)
            || string.Equals(option.Label, value, StringComparison.OrdinalIgnoreCase));
    }

    private static IReadOnlyList<MarkdownPreviewThemeOption> LoadThemeOptions()
    {
        IReadOnlyList<MarkdownPreviewThemeOption> options = LoadThemeOptionsFromSourceFiles();

        if (options.Count == 0)
        {
            options = LoadThemeOptionsFromManifestFiles();
        }

        if (options.Count == 0)
        {
            options = FallbackThemeOptions;
        }

        return options
            .GroupBy(option => option.Id, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.First())
            .OrderBy(option => option.Id == DefaultThemeId ? 0 : 1)
            .ThenBy(option => option.Label, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private static IReadOnlyList<MarkdownPreviewThemeOption> LoadThemeOptionsFromSourceFiles()
    {
        foreach (string directoryPath in GetPreviewThemeSourceDirectories())
        {
            if (!Directory.Exists(directoryPath))
                continue;

            MarkdownPreviewThemeOption[] options = Directory
                .EnumerateFiles(directoryPath, "*.previewTheme.ts", SearchOption.TopDirectoryOnly)
                .Select(TryReadThemeOption)
                .OfType<MarkdownPreviewThemeOption>()
                .ToArray();

            if (options.Length > 0)
            {
                return options;
            }
        }

        return Array.Empty<MarkdownPreviewThemeOption>();
    }

    private static IReadOnlyList<MarkdownPreviewThemeOption> LoadThemeOptionsFromManifestFiles()
    {
        foreach (string filePath in GetPreviewThemeManifestFilePaths())
        {
            if (!File.Exists(filePath))
                continue;

            MarkdownPreviewThemeOption[] options = TryReadThemeManifest(filePath);

            if (options.Length > 0)
            {
                return options;
            }
        }

        return Array.Empty<MarkdownPreviewThemeOption>();
    }

    private static IEnumerable<string> GetPreviewThemeSourceDirectories()
    {
        yield return Path.GetFullPath(Path.Combine(
            AppContext.BaseDirectory,
            "..",
            "..",
            "..",
            "..",
            "Draft.Web",
            "src",
            "themes",
            "preview"));

        yield return Path.GetFullPath(Path.Combine(
            Directory.GetCurrentDirectory(),
            "Draft.Web",
            "src",
            "themes",
            "preview"));

        yield return Path.GetFullPath(Path.Combine(
            Directory.GetCurrentDirectory(),
            "..",
            "Draft.Web",
            "src",
            "themes",
            "preview"));
    }

    private static IEnumerable<string> GetPreviewThemeManifestFilePaths()
    {
        yield return Path.GetFullPath(Path.Combine(
            AppContext.BaseDirectory,
            "Web",
            ThemeManifestFileName));

        yield return Path.GetFullPath(Path.Combine(
            Directory.GetCurrentDirectory(),
            "Web",
            ThemeManifestFileName));

        yield return Path.GetFullPath(Path.Combine(
            Directory.GetCurrentDirectory(),
            "Draft.Web",
            "dist",
            ThemeManifestFileName));

        yield return Path.GetFullPath(Path.Combine(
            Directory.GetCurrentDirectory(),
            "..",
            "Draft.Web",
            "dist",
            ThemeManifestFileName));
    }

    private static MarkdownPreviewThemeOption? TryReadThemeOption(string filePath)
    {
        try
        {
            string source = File.ReadAllText(filePath);
            Match idMatch = ThemeIdRegex.Match(source);
            Match labelMatch = ThemeLabelRegex.Match(source);

            if (!idMatch.Success || !labelMatch.Success)
                return null;

            string id = idMatch.Groups["id"].Value.Trim();
            string label = labelMatch.Groups["label"].Value.Trim();

            return string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(label)
                ? null
                : new MarkdownPreviewThemeOption(id, label);
        }
        catch (IOException)
        {
            return null;
        }
        catch (UnauthorizedAccessException)
        {
            return null;
        }
    }

    private static MarkdownPreviewThemeOption[] TryReadThemeManifest(string filePath)
    {
        try
        {
            string source = File.ReadAllText(filePath);
            PreviewThemeManifest? manifest = JsonSerializer.Deserialize<PreviewThemeManifest>(
                source,
                ThemeManifestJsonOptions);

            return manifest?.Themes?
                .Select(TryCreateThemeOption)
                .OfType<MarkdownPreviewThemeOption>()
                .ToArray() ?? Array.Empty<MarkdownPreviewThemeOption>();
        }
        catch (JsonException)
        {
            return Array.Empty<MarkdownPreviewThemeOption>();
        }
        catch (IOException)
        {
            return Array.Empty<MarkdownPreviewThemeOption>();
        }
        catch (UnauthorizedAccessException)
        {
            return Array.Empty<MarkdownPreviewThemeOption>();
        }
    }

    private static MarkdownPreviewThemeOption? TryCreateThemeOption(PreviewThemeManifestOption option)
    {
        string id = option.Id?.Trim() ?? string.Empty;
        string label = option.Label?.Trim() ?? string.Empty;

        return string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(label)
            ? null
            : new MarkdownPreviewThemeOption(id, label);
    }

    private sealed record PreviewThemeManifest(PreviewThemeManifestOption[]? Themes);

    private sealed record PreviewThemeManifestOption(string? Id, string? Label);
}

public sealed record MarkdownPreviewThemeOption(string Id, string Label);
