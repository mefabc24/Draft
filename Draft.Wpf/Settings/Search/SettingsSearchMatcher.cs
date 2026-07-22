namespace Draft.Settings.Search;

public readonly record struct SettingsSearchMatchRank(
    int WorstSourcePriority,
    int SourcePriorityTotal,
    int WorstMatchQuality,
    int MatchQualityTotal) : IComparable<SettingsSearchMatchRank>
{
    public int CompareTo(SettingsSearchMatchRank other)
    {
        int comparison = WorstSourcePriority.CompareTo(other.WorstSourcePriority);
        if (comparison != 0)
            return comparison;

        comparison = SourcePriorityTotal.CompareTo(other.SourcePriorityTotal);
        if (comparison != 0)
            return comparison;

        comparison = WorstMatchQuality.CompareTo(other.WorstMatchQuality);
        return comparison != 0
            ? comparison
            : MatchQualityTotal.CompareTo(other.MatchQualityTotal);
    }
}

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

    public static bool TryGetRank(
        string? query,
        IEnumerable<string?> titles,
        IEnumerable<string?> descriptions,
        IEnumerable<string?> keywords,
        out SettingsSearchMatchRank rank)
    {
        string[] normalizedTerms = (query ?? string.Empty)
            .Split(
                (char[]?)null,
                StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(Normalize)
            .Where(term => term.Length > 0)
            .ToArray();

        if (normalizedTerms.Length == 0)
        {
            rank = default;
            return true;
        }

        IReadOnlyList<string?>[] sources =
        [
            titles.ToArray(),
            descriptions.ToArray(),
            keywords.ToArray(),
        ];
        int worstSourcePriority = 0;
        int sourcePriorityTotal = 0;
        int worstMatchQuality = 0;
        int matchQualityTotal = 0;

        foreach (string term in normalizedTerms)
        {
            bool foundMatch = false;

            for (int sourcePriority = 0; sourcePriority < sources.Length; sourcePriority++)
            {
                int? matchQuality = GetBestMatchQuality(term, sources[sourcePriority]);
                if (matchQuality is null)
                    continue;

                worstSourcePriority = Math.Max(worstSourcePriority, sourcePriority);
                sourcePriorityTotal += sourcePriority;
                worstMatchQuality = Math.Max(worstMatchQuality, matchQuality.Value);
                matchQualityTotal += matchQuality.Value;
                foundMatch = true;
                break;
            }

            if (!foundMatch)
            {
                rank = default;
                return false;
            }
        }

        rank = new SettingsSearchMatchRank(
            worstSourcePriority,
            sourcePriorityTotal,
            worstMatchQuality,
            matchQualityTotal);
        return true;
    }

    private static int? GetBestMatchQuality(
        string normalizedTerm,
        IEnumerable<string?> values)
    {
        int? bestQuality = null;

        foreach (string? candidate in values)
        {
            if (string.IsNullOrWhiteSpace(candidate))
                continue;

            string value = candidate;
            string normalizedValue = Normalize(value);
            if (string.Equals(normalizedValue, normalizedTerm, StringComparison.Ordinal))
                return 0;

            string[] words = GetNormalizedWords(value);
            if (words.Any(word => string.Equals(word, normalizedTerm, StringComparison.Ordinal)))
                return 0;

            if (words.Any(word => word.StartsWith(normalizedTerm, StringComparison.Ordinal)))
                bestQuality = Math.Min(bestQuality ?? 1, 1);
            else if (words.Any(word => word.Contains(normalizedTerm, StringComparison.Ordinal)))
                bestQuality = Math.Min(bestQuality ?? 2, 2);
            else if (normalizedValue.Contains(normalizedTerm, StringComparison.Ordinal))
                bestQuality = Math.Min(bestQuality ?? 3, 3);
        }

        return bestQuality;
    }

    private static string[] GetNormalizedWords(string value)
    {
        List<string> words = new();
        List<char> currentWord = new();

        foreach (char character in value)
        {
            if (char.IsLetterOrDigit(character))
            {
                currentWord.Add(char.ToUpperInvariant(character));
                continue;
            }

            AddCurrentWord(words, currentWord);
        }

        AddCurrentWord(words, currentWord);
        return words.ToArray();
    }

    private static void AddCurrentWord(ICollection<string> words, List<char> currentWord)
    {
        if (currentWord.Count == 0)
            return;

        words.Add(new string(currentWord.ToArray()));
        currentWord.Clear();
    }
}
