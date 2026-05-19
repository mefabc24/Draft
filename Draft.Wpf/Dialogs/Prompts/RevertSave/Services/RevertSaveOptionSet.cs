using Draft.Save.Models;

namespace Draft.Dialogs.Prompts.RevertSave.Services;

public sealed record RevertSaveOptionSet(
    ManualSaveSnapshot? LastManualSnapshot,
    AutosaveSnapshot? LastAutosaveSnapshot,
    bool LastManualIsLatest,
    bool LastAutosaveIsLatest);
