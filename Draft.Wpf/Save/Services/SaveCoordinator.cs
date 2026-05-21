using Draft.Documents.Services;
using Draft.Save.Models;
using System.IO;
using System.Security;
using System.Text.Json;

namespace Draft.Save.Services;

public sealed class SaveCoordinator
{
    private readonly AutosaveSnapshotService _autosaveSnapshotService;
    private readonly DocumentFileService _documentFileService;
    private readonly ManualSaveSnapshotService _manualSaveSnapshotService;

    public SaveCoordinator()
        : this(new DocumentFileService(), new ManualSaveSnapshotService(), new AutosaveSnapshotService())
    {
    }

    public SaveCoordinator(
        DocumentFileService documentFileService,
        ManualSaveSnapshotService manualSaveSnapshotService,
        AutosaveSnapshotService autosaveSnapshotService)
    {
        _documentFileService = documentFileService;
        _manualSaveSnapshotService = manualSaveSnapshotService;
        _autosaveSnapshotService = autosaveSnapshotService;
    }

    public async Task<DocumentSaveResult> SaveAsync(
        string path,
        string content,
        DocumentSaveKind saveKind,
        CancellationToken cancellationToken = default)
    {
        string fullPath = await _documentFileService.WriteDocumentAsync(path, content, cancellationToken);
        DateTimeOffset? snapshotUpdatedAtUtc = saveKind == DocumentSaveKind.Manual
            ? await TrySaveManualSnapshotAsync(fullPath, content, cancellationToken)
            : await TrySaveAutosaveSnapshotAsync(fullPath, content, cancellationToken);

        return new DocumentSaveResult(
            fullPath,
            snapshotUpdatedAtUtc ?? DateTimeOffset.UtcNow);
    }

    private async Task<DateTimeOffset?> TrySaveManualSnapshotAsync(
        string fullPath,
        string content,
        CancellationToken cancellationToken)
    {
        try
        {
            ManualSaveSnapshotMetadata metadata =
                await _manualSaveSnapshotService.SaveManualSnapshotAsync(fullPath, content, cancellationToken);
            return metadata.UpdatedAtUtc;
        }
        catch (Exception ex) when (IsSnapshotOperationException(ex))
        {
            return null;
        }
    }

    private async Task<DateTimeOffset?> TrySaveAutosaveSnapshotAsync(
        string fullPath,
        string content,
        CancellationToken cancellationToken)
    {
        try
        {
            AutosaveSnapshotMetadata metadata =
                await _autosaveSnapshotService.SaveAutosaveSnapshotAsync(fullPath, content, cancellationToken);
            return metadata.UpdatedAtUtc;
        }
        catch (Exception ex) when (IsSnapshotOperationException(ex))
        {
            return null;
        }
    }

    private static bool IsSnapshotOperationException(Exception ex)
    {
        return ex is IOException
            or UnauthorizedAccessException
            or ArgumentException
            or NotSupportedException
            or PathTooLongException
            or SecurityException
            or InvalidOperationException
            or JsonException
            or System.Security.Cryptography.CryptographicException;
    }
}
