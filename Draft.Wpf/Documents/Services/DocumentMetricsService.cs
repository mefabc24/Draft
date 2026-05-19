using Draft.Documents.Models;
using System.Text.RegularExpressions;

namespace Draft.Documents.Services;

public sealed class DocumentMetricsService
{
    public DocumentMetrics Calculate(string content, bool includeMarkdownSyntaxInCharacterCount = false)
    {
        return new DocumentMetrics(
            CountWords(content),
            CountCharacters(content, includeMarkdownSyntaxInCharacterCount));
    }

    public int CountWords(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
            return 0;

        string plainText = StripMarkdownSyntax(content);
        return Regex.Matches(plainText, @"[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*").Count;
    }

    public int CountCharacters(string content, bool includeMarkdownSyntax)
    {
        if (string.IsNullOrEmpty(content))
            return 0;

        if (includeMarkdownSyntax)
            return content.Length;

        // Keep this approximation aligned with the existing WPF status bar metrics.
        string plainText = StripMarkdownSyntax(content);
        plainText = Regex.Replace(plainText, @"(?m)^[ \t]+", string.Empty);
        plainText = Regex.Replace(plainText, @"(?m)[ \t]+$", string.Empty);

        return plainText.Length;
    }

    private static string StripMarkdownSyntax(string content)
    {
        string text = content;

        text = Regex.Replace(text, @"(?m)^\s{0,3}(?:`{3,}|~{3,}).*$", " ");
        text = Regex.Replace(text, @"(?m)^\s{0,3}\[[^\]]+\]:\s+\S+.*$", " ");
        text = Regex.Replace(text, @"!\[([^\]]*)\]\([^)]+\)", "$1");
        text = Regex.Replace(text, @"\[([^\]]+)\]\([^)]+\)", "$1");
        text = Regex.Replace(text, @"\[([^\]]+)\]\[[^\]]*\]", "$1");
        text = Regex.Replace(text, @"(?m)^\s{0,3}#{1,6}\s*", " ");
        text = Regex.Replace(text, @"(?m)^\s{0,3}>\s?", " ");
        text = Regex.Replace(text, @"(?m)^\s{0,3}(?:[-+*]|\d+[.)])\s+", " ");
        text = Regex.Replace(text, @"(?m)^\s{0,3}(?:[-*_]\s*){3,}$", " ");
        text = Regex.Replace(text, @"(?m)^\s{0,3}(?:=+|-+)\s*$", " ");
        text = Regex.Replace(text, @"(?m)\[[ xX]\]\s+", " ");
        text = Regex.Replace(text, @"<[^>\r\n]+>", " ");
        text = Regex.Replace(text, @"[`*_~|]", " ");
        text = Regex.Replace(text, @"\\([\\`*_{}\[\]()#+\-.!>])", "$1");

        return text;
    }
}
