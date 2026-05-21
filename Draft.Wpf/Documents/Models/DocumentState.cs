namespace Draft.Documents.Models;

public sealed record DocumentState(
    string Content,
    string FullPath,
    DateTimeOffset LastWriteTimeUtc);
