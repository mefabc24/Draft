namespace Draft.Models.Save;

public sealed record ManualSaveSnapshot(
    string Content,
    ManualSaveSnapshotMetadata Metadata);
