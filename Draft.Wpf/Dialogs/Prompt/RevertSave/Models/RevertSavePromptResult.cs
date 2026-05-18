namespace Draft.Dialogs.Prompt.RevertSave.Models;

public sealed record RevertSavePromptResult(
    bool IsConfirmed,
    RevertSaveOptionKind SelectedVersion,
    string? RestoredContent)
{
    public static RevertSavePromptResult Cancelled { get; } = new(false, RevertSaveOptionKind.LastAutosave, null);

    public static RevertSavePromptResult LastAutosave(string content)
    {
        return new RevertSavePromptResult(true, RevertSaveOptionKind.LastAutosave, content);
    }

    public static RevertSavePromptResult LastManualSave(string content)
    {
        return new RevertSavePromptResult(true, RevertSaveOptionKind.LastManualSave, content);
    }
}
