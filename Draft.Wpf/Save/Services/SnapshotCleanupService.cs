using Draft.Shared.Paths;
using Draft.Save.Models;
using System.IO;
using System.Security;
using System.Text.Json;

namespace Draft.Save.Services;

public sealed class SnapshotCleanupService
{
    private static readonly TimeSpan Retention = TimeSpan.FromDays(7);

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
    };
    private static readonly SnapshotMetadataService SnapshotMetadataService = new();

    public bool ShouldRunCleanup()
    {
        try
        {
            SnapshotCleanupState? state = ReadState();
            DateTime utcToday = DateTimeOffset.UtcNow.UtcDateTime.Date;

            return state?.LastSnapshotCleanupDateUtc.UtcDateTime.Date != utcToday;
        }
        catch (Exception ex) when (IsCleanupPersistenceException(ex))
        {
            return true;
        }
    }

    public Task CleanupOldSnapshotsAsync(CancellationToken cancellationToken = default)
    {
        return Task.Run(() => CleanupOldSnapshots(cancellationToken), cancellationToken);
    }

    private void CleanupOldSnapshots(CancellationToken cancellationToken)
    {
        if (!ShouldRunCleanup())
            return;

        DateTimeOffset now = DateTimeOffset.UtcNow;
        DateTimeOffset cutoff = now - Retention;

        try
        {
            if (Directory.Exists(AppDataPaths.SnapshotsDirectory))
            {
                foreach (string snapshotFolder in Directory.EnumerateDirectories(AppDataPaths.SnapshotsDirectory))
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    TryDeleteIfExpired(snapshotFolder, cutoff);
                }
            }
        }
        catch (Exception ex) when (IsCleanupPersistenceException(ex))
        {
        }
        finally
        {
            TryWriteState(new SnapshotCleanupState(now));
        }
    }

    private static void TryDeleteIfExpired(string snapshotFolder, DateTimeOffset cutoff)
    {
        try
        {
            DateTimeOffset timestamp = GetSnapshotTimestamp(snapshotFolder);
            if (timestamp >= cutoff)
                return;

            Directory.Delete(snapshotFolder, recursive: true);
        }
        catch (Exception ex) when (IsCleanupPersistenceException(ex))
        {
        }
    }

    private static DateTimeOffset GetSnapshotTimestamp(string snapshotFolder)
    {
        DateTimeOffset? metadataTimestamp = null;
        ManualSaveSnapshotMetadata? manualMetadata = SnapshotMetadataService.TryReadMetadata<ManualSaveSnapshotMetadata>(
            Path.Combine(snapshotFolder, "metadata.json"));
        AutosaveSnapshotMetadata? autosaveMetadata = SnapshotMetadataService.TryReadMetadata<AutosaveSnapshotMetadata>(
            Path.Combine(snapshotFolder, "autosave-metadata.json"));

        if (manualMetadata is not null)
        {
            metadataTimestamp = MaxTimestamp(metadataTimestamp, manualMetadata.UpdatedAtUtc);
            metadataTimestamp = MaxTimestamp(metadataTimestamp, manualMetadata.CreatedAtUtc);
        }

        if (autosaveMetadata is not null)
        {
            metadataTimestamp = MaxTimestamp(metadataTimestamp, autosaveMetadata.UpdatedAtUtc);
            metadataTimestamp = MaxTimestamp(metadataTimestamp, autosaveMetadata.CreatedAtUtc);
        }

        DateTime latestWriteTimeUtc = Directory.GetLastWriteTimeUtc(snapshotFolder);

        foreach (string filePath in Directory.EnumerateFiles(snapshotFolder))
        {
            DateTime fileWriteTimeUtc = File.GetLastWriteTimeUtc(filePath);
            if (fileWriteTimeUtc > latestWriteTimeUtc)
            {
                latestWriteTimeUtc = fileWriteTimeUtc;
            }
        }

        return MaxTimestamp(metadataTimestamp, new DateTimeOffset(latestWriteTimeUtc, TimeSpan.Zero))
            ?? new DateTimeOffset(latestWriteTimeUtc, TimeSpan.Zero);
    }

    private static DateTimeOffset? MaxTimestamp(DateTimeOffset? current, DateTimeOffset candidate)
    {
        if (candidate == default)
            return current;

        return current is null || candidate > current.Value
            ? candidate
            : current;
    }

    private static SnapshotCleanupState? ReadState()
    {
        if (!File.Exists(AppDataPaths.SnapshotCleanupStateFilePath))
            return null;

        string json = File.ReadAllText(AppDataPaths.SnapshotCleanupStateFilePath);
        return JsonSerializer.Deserialize<SnapshotCleanupState>(json, JsonOptions);
    }

    private static void TryWriteState(SnapshotCleanupState state)
    {
        try
        {
            Directory.CreateDirectory(AppDataPaths.DraftAppDataDirectory);
            string json = JsonSerializer.Serialize(state, JsonOptions);
            File.WriteAllText(AppDataPaths.SnapshotCleanupStateFilePath, json);
        }
        catch (Exception ex) when (IsCleanupPersistenceException(ex))
        {
        }
    }

    private static bool IsCleanupPersistenceException(Exception ex)
    {
        return ex is IOException
            or UnauthorizedAccessException
            or ArgumentException
            or NotSupportedException
            or PathTooLongException
            or SecurityException
            or JsonException;
    }

    private sealed record SnapshotCleanupState(DateTimeOffset LastSnapshotCleanupDateUtc);
}
