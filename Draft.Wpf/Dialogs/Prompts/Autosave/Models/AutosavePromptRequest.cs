namespace Draft.Dialogs.Prompts.Autosave.Models;

public sealed class AutosavePromptRequest
{
    public AutosavePromptRequest(bool autosaveEnabled, string autosaveInterval)
    {
        AutosaveEnabled = autosaveEnabled;
        AutosaveInterval = autosaveInterval;
    }

    public bool AutosaveEnabled { get; }

    public string AutosaveInterval { get; }
}
