using Draft.Helpers;
using Draft.Models.Save;
using System.IO;
using System.Security;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Draft.Services.Save;

public sealed class ManualSaveSnapshotService
{
    private const string SnapshotFileName = "last-manual.md";
    private const string MetadataFileName = "metadata.json";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
    };

    private readonly FileIdentityService _fileIdentityService;
    private readonly DocumentMetricsService _documentMetricsService;

    public ManualSaveSnapshotService()
        : this(new FileIdentityService(), new DocumentMetricsService())
    {
    }

    public ManualSaveSnapshotService(
        FileIdentityService fileIdentityService,
        DocumentMetricsService documentMetricsService)
    {
        _fileIdentityService = fileIdentityService;
        _documentMetricsService = documentMetricsService;
    }

    public async Task<ManualSaveSnapshotMetadata> SaveManualSnapshotAsync(
        string filePath,
        string content,
        CancellationToken cancellationToken = default)
    {
        FileIdentity identity = _fileIdentityService.Create(filePath);
        string folderPath = GetSnapshotFolderPath(identity.FileKey);
        string snapshotPath = Path.Combine(folderPath, SnapshotFileName);
        string metadataPath = Path.Combine(folderPath, MetadataFileName);
        DateTimeOffset now = DateTimeOffset.UtcNow;
        ManualSaveSnapshotMetadata? existingMetadata = TryReadMetadata(metadataPath);
        DateTimeOffset createdAtUtc = existingMetadata is not null
            && _fileIdentityService.Matches(identity, existingMetadata)
                ? existingMetadata.CreatedAtUtc
                : now;

        Directory.CreateDirectory(folderPath);
        await File.WriteAllTextAsync(snapshotPath, content, cancellationToken);

        ManualSaveSnapshotMetadata metadata = new(
            identity.OriginalPath,
            identity.NormalizedPath,
            identity.FileKey,
            createdAtUtc,
            now,
            _documentMetricsService.CountWords(content),
            ComputeContentHash(content),
            GetAppVersion());

        string metadataJson = JsonSerializer.Serialize(metadata, JsonOptions);
        await File.WriteAllTextAsync(metadataPath, metadataJson, cancellationToken);

        return metadata;
    }

    public ManualSaveSnapshot? LoadManualSnapshot(string filePath)
    {
        try
        {
            FileIdentity identity = _fileIdentityService.Create(filePath);
            string folderPath = GetSnapshotFolderPath(identity.FileKey);
            string snapshotPath = Path.Combine(folderPath, SnapshotFileName);
            string metadataPath = Path.Combine(folderPath, MetadataFileName);

            if (!File.Exists(snapshotPath) || !File.Exists(metadataPath))
                return null;

            ManualSaveSnapshotMetadata? metadata = TryReadMetadata(metadataPath);
            if (metadata is null || !_fileIdentityService.Matches(identity, metadata))
                return null;

            string content = File.ReadAllText(snapshotPath);
            if (!string.IsNullOrWhiteSpace(metadata.ContentHash)
                && !string.Equals(metadata.ContentHash, ComputeContentHash(content), StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            return new ManualSaveSnapshot(content, metadata);
        }
        catch (Exception ex) when (IsSnapshotReadException(ex))
        {
            return null;
        }
    }

    public string GetSnapshotFolderPath(string fileKey)
    {
        return Path.Combine(AppDataPaths.SnapshotsDirectory, fileKey);
    }

    internal static ManualSaveSnapshotMetadata? TryReadMetadata(string metadataPath)
    {
        try
        {
            if (!File.Exists(metadataPath))
                return null;

            string json = File.ReadAllText(metadataPath);
            return JsonSerializer.Deserialize<ManualSaveSnapshotMetadata>(json, JsonOptions);
        }
        catch (Exception ex) when (IsSnapshotReadException(ex))
        {
            return null;
        }
    }

    private static string ComputeContentHash(string content)
    {
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(content)))
            .ToLowerInvariant();
    }

    private static string? GetAppVersion()
    {
        return typeof(ManualSaveSnapshotService).Assembly.GetName().Version?.ToString();
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
