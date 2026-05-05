using Velopack;
using Velopack.Sources;

namespace Draft.Helpers;

public enum UpdateCheckStatus
{
    NotInstalledWithVelopack,
    UpToDate,
    UpdateAvailable,
    Failed,
}

public sealed class UpdateCheckResult
{
    private UpdateCheckResult(
        UpdateCheckStatus status,
        string message,
        string? version,
        UpdateInfo? updateInfo)
    {
        Status = status;
        Message = message;
        Version = version;
        UpdateInfo = updateInfo;
    }

    public UpdateCheckStatus Status { get; }

    public string Message { get; }

    public string? Version { get; }

    internal UpdateInfo? UpdateInfo { get; }

    public static UpdateCheckResult NotInstalled()
    {
        return new UpdateCheckResult(
            UpdateCheckStatus.NotInstalledWithVelopack,
            "Updates are only available in installed Draft releases.",
            null,
            null);
    }

    public static UpdateCheckResult UpToDate()
    {
        return new UpdateCheckResult(
            UpdateCheckStatus.UpToDate,
            "Draft is up to date.",
            null,
            null);
    }

    public static UpdateCheckResult UpdateAvailable(UpdateInfo updateInfo)
    {
        string version = updateInfo.TargetFullRelease.Version.ToString();
        return new UpdateCheckResult(
            UpdateCheckStatus.UpdateAvailable,
            $"Draft {version} is available.",
            version,
            updateInfo);
    }

    public static UpdateCheckResult Failed(string message)
    {
        return new UpdateCheckResult(
            UpdateCheckStatus.Failed,
            message,
            null,
            null);
    }
}

public sealed class UpdateService
{
    private const string RepositoryUrl = "https://github.com/mefabc24/Draft";
    private readonly UpdateManager _updateManager;

    public UpdateService()
        : this(new UpdateManager(new GithubSource(RepositoryUrl, null, false, null)))
    {
    }

    internal UpdateService(UpdateManager updateManager)
    {
        _updateManager = updateManager;
    }

    public async Task<UpdateCheckResult> CheckForUpdatesAsync(CancellationToken cancellationToken)
    {
        if (!_updateManager.IsInstalled)
        {
            return UpdateCheckResult.NotInstalled();
        }

        try
        {
            cancellationToken.ThrowIfCancellationRequested();
            UpdateInfo? updateInfo = await _updateManager.CheckForUpdatesAsync();
            cancellationToken.ThrowIfCancellationRequested();

            return updateInfo is null
                ? UpdateCheckResult.UpToDate()
                : UpdateCheckResult.UpdateAvailable(updateInfo);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            return UpdateCheckResult.Failed(
                $"Unable to check for updates. Make sure Draft releases are public and try again.\n\n{ex.Message}");
        }
    }

    public async Task DownloadAndApplyUpdateAsync(
        UpdateCheckResult updateCheckResult,
        Action<int> progress,
        CancellationToken cancellationToken)
    {
        if (updateCheckResult.Status != UpdateCheckStatus.UpdateAvailable
            || updateCheckResult.UpdateInfo is null)
        {
            throw new InvalidOperationException("No Draft update is available to install.");
        }

        await _updateManager.DownloadUpdatesAsync(
            updateCheckResult.UpdateInfo,
            progress,
            cancellationToken);

        _updateManager.ApplyUpdatesAndRestart(
            updateCheckResult.UpdateInfo.TargetFullRelease,
            Array.Empty<string>());
    }
}
