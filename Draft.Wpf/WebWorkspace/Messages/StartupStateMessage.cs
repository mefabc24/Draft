namespace Draft.WebWorkspace.Messages;

public sealed record StartupStateMessage(
    string Type,
    StartupDocumentMessage Document,
    string WorkspaceMode,
    int DocumentGeneration,
    SettingsChangedMessage Settings);
