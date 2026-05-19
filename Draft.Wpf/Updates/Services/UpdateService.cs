using Velopack;
using Velopack.Sources;

using Draft.Updates.Models;

namespace Draft.Updates.Services;

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
