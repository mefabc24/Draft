using Draft.Save.Models;
using Draft.Save.Services;

namespace Draft.Dialogs.Prompts.RevertSave.Services;

public sealed class RevertSaveOptionProvider
{
    private readonly AutosaveSnapshotService _autosaveSnapshotService;
    private readonly ManualSaveSnapshotService _manualSaveSnapshotService;

    public RevertSaveOptionProvider()
        : this(new ManualSaveSnapshotService(), new AutosaveSnapshotService())
    {
    }

    public RevertSaveOptionProvider(
        ManualSaveSnapshotService manualSaveSnapshotService,
        AutosaveSnapshotService autosaveSnapshotService)
    {
        _manualSaveSnapshotService = manualSaveSnapshotService;
        _autosaveSnapshotService = autosaveSnapshotService;
    }

    public RevertSaveOptionSet Load(string? filePath)
    {
        ManualSaveSnapshot? lastManualSnapshot = string.IsNullOrWhiteSpace(filePath)
            ? null
            : _manualSaveSnapshotService.LoadManualSnapshot(filePath);
        AutosaveSnapshot? lastAutosaveSnapshot = string.IsNullOrWhiteSpace(filePath)
            ? null
            : _autosaveSnapshotService.LoadAutosaveSnapshot(filePath);

        DateTimeOffset? manualTimestamp = lastManualSnapshot?.Metadata.UpdatedAtUtc;
        DateTimeOffset? autosaveTimestamp = lastAutosaveSnapshot?.Metadata.UpdatedAtUtc;
        bool manualIsLatest = manualTimestamp is not null
            && (autosaveTimestamp is null || manualTimestamp.Value > autosaveTimestamp.Value);
        bool autosaveIsLatest = autosaveTimestamp is not null
            && (manualTimestamp is null || autosaveTimestamp.Value >= manualTimestamp.Value);

        return new RevertSaveOptionSet(
            lastManualSnapshot,
            lastAutosaveSnapshot,
            manualIsLatest,
            autosaveIsLatest);
    }
}
