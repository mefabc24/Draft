using Draft.Shared.Paths;
using System.IO;

namespace Draft.Save.Services;

public sealed class SnapshotPathService
{
    public string GetSnapshotFolderPath(string fileKey)
    {
        return Path.Combine(AppDataPaths.SnapshotsDirectory, fileKey);
    }

    public string GetSnapshotPath(string folderPath, string snapshotFileName)
    {
        return Path.Combine(folderPath, snapshotFileName);
    }

    public string GetMetadataPath(string folderPath, string metadataFileName)
    {
        return Path.Combine(folderPath, metadataFileName);
    }
}
