using Draft.Models.Save;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace Draft.Services.Save;

public sealed class FileIdentityService
{
    public FileIdentity Create(string filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath))
            throw new ArgumentException("File path is required.", nameof(filePath));

        string normalizedPath = NormalizePath(filePath);
        string keySource = OperatingSystem.IsWindows()
            ? normalizedPath.ToUpperInvariant()
            : normalizedPath;
        string fileKey = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(keySource)))
            .ToLowerInvariant();

        return new FileIdentity(filePath, normalizedPath, fileKey);
    }

    public bool Matches(FileIdentity identity, ManualSaveSnapshotMetadata metadata)
    {
        return string.Equals(identity.FileKey, metadata.FileKey, StringComparison.OrdinalIgnoreCase)
            && string.Equals(
                identity.NormalizedPath,
                metadata.NormalizedFilePath,
                OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal);
    }

    private static string NormalizePath(string filePath)
    {
        string fullPath = Path.GetFullPath(filePath);
        return fullPath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
    }
}
