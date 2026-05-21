using Draft.Documents.Models;
using Draft.Save.Models;
using System.IO;
using System.Security;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Draft.Save.Services;

public sealed class SnapshotMetadataService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
    };

    public TMetadata? TryReadMetadata<TMetadata>(string metadataPath)
        where TMetadata : class, ISnapshotMetadata
    {
        try
        {
            if (!File.Exists(metadataPath))
                return null;

            string json = File.ReadAllText(metadataPath);
            return JsonSerializer.Deserialize<TMetadata>(json, JsonOptions);
        }
        catch (Exception ex) when (IsSnapshotReadException(ex))
        {
            return null;
        }
    }

    public Task WriteMetadataAsync<TMetadata>(
        string metadataPath,
        TMetadata metadata,
        CancellationToken cancellationToken)
        where TMetadata : class, ISnapshotMetadata
    {
        string metadataJson = JsonSerializer.Serialize(metadata, JsonOptions);
        return File.WriteAllTextAsync(metadataPath, metadataJson, cancellationToken);
    }

    public bool Matches(FileIdentity identity, ISnapshotMetadata metadata)
    {
        return string.Equals(identity.FileKey, metadata.FileKey, StringComparison.OrdinalIgnoreCase)
            && string.Equals(
                identity.NormalizedPath,
                metadata.NormalizedFilePath,
                OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal);
    }

    public bool IsContentHashValid(ISnapshotMetadata metadata, string content)
    {
        return string.IsNullOrWhiteSpace(metadata.ContentHash)
            || string.Equals(metadata.ContentHash, ComputeContentHash(content), StringComparison.OrdinalIgnoreCase);
    }

    public string ComputeContentHash(string content)
    {
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(content)))
            .ToLowerInvariant();
    }

    public string? GetAppVersion()
    {
        return typeof(SnapshotMetadataService).Assembly.GetName().Version?.ToString();
    }

    private static bool IsSnapshotReadException(Exception ex)
    {
        return ex is IOException
            or UnauthorizedAccessException
            or ArgumentException
            or NotSupportedException
            or PathTooLongException
            or SecurityException
            or JsonException;
    }
}
