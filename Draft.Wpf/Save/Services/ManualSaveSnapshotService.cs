using Draft.Documents.Models;
using Draft.Documents.Services;
using Draft.Save.Models;
using System.IO;
using System.Security;
using System.Text.Json;

namespace Draft.Save.Services;

public sealed class ManualSaveSnapshotService
{
    private const string SnapshotFileName = "last-manual.md";
    private const string MetadataFileName = "metadata.json";

    private readonly FileIdentityService _fileIdentityService;
    private readonly DocumentMetricsService _documentMetricsService;
    private readonly SnapshotMetadataService _snapshotMetadataService;
    private readonly SnapshotPathService _snapshotPathService;

    public ManualSaveSnapshotService()
        : this(new FileIdentityService(), new DocumentMetricsService())
    {
    }

    public ManualSaveSnapshotService(
        FileIdentityService fileIdentityService,
        DocumentMetricsService documentMetricsService)
        : this(
            fileIdentityService,
            documentMetricsService,
            new SnapshotPathService(),
            new SnapshotMetadataService())
    {
    }

    public ManualSaveSnapshotService(
        FileIdentityService fileIdentityService,
        DocumentMetricsService documentMetricsService,
        SnapshotPathService snapshotPathService,
        SnapshotMetadataService snapshotMetadataService)
    {
        _fileIdentityService = fileIdentityService;
        _documentMetricsService = documentMetricsService;
        _snapshotPathService = snapshotPathService;
        _snapshotMetadataService = snapshotMetadataService;
    }

    public async Task<ManualSaveSnapshotMetadata> SaveManualSnapshotAsync(
        string filePath,
        string content,
        CancellationToken cancellationToken = default)
    {
        FileIdentity identity = _fileIdentityService.Create(filePath);
        string folderPath = _snapshotPathService.GetSnapshotFolderPath(identity.FileKey);
        string snapshotPath = _snapshotPathService.GetSnapshotPath(folderPath, SnapshotFileName);
        string metadataPath = _snapshotPathService.GetMetadataPath(folderPath, MetadataFileName);
        DateTimeOffset now = DateTimeOffset.UtcNow;
        ManualSaveSnapshotMetadata? existingMetadata =
            _snapshotMetadataService.TryReadMetadata<ManualSaveSnapshotMetadata>(metadataPath);
        DateTimeOffset createdAtUtc = existingMetadata is not null
            && _snapshotMetadataService.Matches(identity, existingMetadata)
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
            _snapshotMetadataService.ComputeContentHash(content),
            _snapshotMetadataService.GetAppVersion());

        await _snapshotMetadataService.WriteMetadataAsync(metadataPath, metadata, cancellationToken);

        return metadata;
    }

    public ManualSaveSnapshot? LoadManualSnapshot(string filePath)
    {
        try
        {
            FileIdentity identity = _fileIdentityService.Create(filePath);
            string folderPath = _snapshotPathService.GetSnapshotFolderPath(identity.FileKey);
            string snapshotPath = _snapshotPathService.GetSnapshotPath(folderPath, SnapshotFileName);
            string metadataPath = _snapshotPathService.GetMetadataPath(folderPath, MetadataFileName);

            if (!File.Exists(snapshotPath) || !File.Exists(metadataPath))
                return null;

            ManualSaveSnapshotMetadata? metadata =
                _snapshotMetadataService.TryReadMetadata<ManualSaveSnapshotMetadata>(metadataPath);
            if (metadata is null || !_snapshotMetadataService.Matches(identity, metadata))
                return null;

            string content = File.ReadAllText(snapshotPath);
            if (!_snapshotMetadataService.IsContentHashValid(metadata, content))
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
