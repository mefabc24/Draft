namespace Draft.WebWorkspace.Messages;

public sealed record LoadDocumentMessage(string Type, string Content, string FileName);
