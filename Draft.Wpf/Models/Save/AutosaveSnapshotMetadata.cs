namespace Draft.Models.Save;

public sealed record AutosaveSnapshotMetadata(
    string OriginalFilePath,
    string NormalizedFilePath,
    string FileKey,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc,
    int WordCount,
    string ContentHash,
    string? AppVersion);
