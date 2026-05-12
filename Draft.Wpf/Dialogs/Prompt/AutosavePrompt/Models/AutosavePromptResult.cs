namespace Draft.Dialogs.Prompt.AutosavePrompt.Models;

public sealed record AutosavePromptResult(
    bool IsConfirmed,
    bool AutosaveEnabled,
    string AutosaveInterval)
{
    public static AutosavePromptResult Cancelled { get; } = new(false, false, "10s");

    public static AutosavePromptResult Confirmed(bool autosaveEnabled, string autosaveInterval)
    {
        return new AutosavePromptResult(true, autosaveEnabled, autosaveInterval);
    }
}
