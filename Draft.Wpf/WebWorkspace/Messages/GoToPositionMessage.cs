namespace Draft.WebWorkspace.Messages;

public sealed record GoToPositionMessage(string Type, int Line, int Column);
