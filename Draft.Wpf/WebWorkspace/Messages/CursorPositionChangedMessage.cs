namespace Draft.WebWorkspace.Messages;

public sealed record CursorPositionChangedMessage(
    string Type,
    int Line,
    int Column,
    int SelectedCharacterCount);
