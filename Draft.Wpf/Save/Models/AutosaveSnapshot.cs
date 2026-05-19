namespace Draft.Save.Models;

public sealed record AutosaveSnapshot(
    string Content,
    AutosaveSnapshotMetadata Metadata);
