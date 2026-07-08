namespace Draft.WebWorkspace.Messages;

public sealed record StartupDocumentMessage(
    string Content,
    string DisplayFileName,
    string? FilePath,
    bool IsUntitled,
    bool IsModified);
