namespace Draft.Documents.Models;

public sealed record FileIdentity(
    string OriginalPath,
    string NormalizedPath,
    string FileKey);
