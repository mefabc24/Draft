namespace Draft.Models.Save;

public sealed record ManualSaveSnapshotMetadata(
    string OriginalFilePath,
    string NormalizedFilePath,
    string FileKey,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc,
    int WordCount,
    string ContentHash,
    string? AppVersion);
