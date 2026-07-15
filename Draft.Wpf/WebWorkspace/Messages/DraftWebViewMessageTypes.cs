namespace Draft.WebWorkspace.Messages;

public static class DraftWebViewMessageTypes
{
    public const string WorkspaceModeChanged = "workspaceModeChanged";
    public const string WorkspaceReady = "workspaceReady";
    public const string StartupState = "startupState";
    public const string StartupStateApplied = "startupStateApplied";
    public const string LoadDocument = "loadDocument";
    public const string DocumentChanged = "documentChanged";
    public const string CursorPositionChanged = "cursorPositionChanged";
    public const string ClipboardTextCopied = "clipboardTextCopied";
    public const string SettingsChanged = "settingsChanged";
    public const string GoToPosition = "goToPosition";
    public const string SaveRequested = "saveRequested";
    public const string OpenRequested = "openRequested";
    public const string OpenExternalUrl = "openExternalUrl";
    public const string KeyboardShortcutRecordingChanged = "keyboardShortcutRecordingChanged";
}
