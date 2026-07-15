namespace Draft.Localization;

public sealed record LanguageMetadata(
    string Code,
    string ShortName,
    string DisplayName,
    string EnglishName,
    string? Flag);
