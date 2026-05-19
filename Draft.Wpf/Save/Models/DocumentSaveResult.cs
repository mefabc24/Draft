namespace Draft.Save.Models;

public sealed record DocumentSaveResult(
    string FullPath,
    DateTimeOffset SavedAtUtc);
