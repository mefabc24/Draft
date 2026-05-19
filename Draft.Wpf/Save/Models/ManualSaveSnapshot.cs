namespace Draft.Save.Models;

public sealed record ManualSaveSnapshot(
    string Content,
    ManualSaveSnapshotMetadata Metadata);
