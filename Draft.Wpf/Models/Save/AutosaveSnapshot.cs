namespace Draft.Models.Save;

public sealed record AutosaveSnapshot(
    string Content,
    AutosaveSnapshotMetadata Metadata);
