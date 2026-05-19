namespace Draft.Save.Models;

public interface ISnapshotMetadata
{
    string NormalizedFilePath { get; }

    string FileKey { get; }

    DateTimeOffset CreatedAtUtc { get; }

    DateTimeOffset UpdatedAtUtc { get; }

    string ContentHash { get; }
}
