namespace Draft.Settings.Search;

public static class SettingsSearchMatcher
{
    public static bool Matches(string? query, IEnumerable<string?> searchableValues)
    {
        string[] normalizedTerms = (query ?? string.Empty)
            .Split(
                (char[]?)null,
                StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(Normalize)
            .Where(term => term.Length > 0)
            .ToArray();

        if (normalizedTerms.Length == 0)
            return true;

        string[] normalizedValues = searchableValues
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => Normalize(value!))
            .Where(value => value.Length > 0)
            .ToArray();

        return normalizedTerms.All(term =>
            normalizedValues.Any(value => value.Contains(term, StringComparison.Ordinal)));
    }

    public static string Normalize(string value)
    {
        return new string(value
            .Where(char.IsLetterOrDigit)
            .Select(char.ToUpperInvariant)
            .ToArray());
    }
}
