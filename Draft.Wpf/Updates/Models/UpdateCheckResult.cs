using Velopack;

namespace Draft.Updates.Models;

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
            LocalizationService.Translate(
                "updates.onlyInstalledReleases",
                "Updates are only available in installed Draft releases."),
            null,
            null);
    }

    public static UpdateCheckResult UpToDate()
    {
        return new UpdateCheckResult(
            UpdateCheckStatus.UpToDate,
            LocalizationService.Translate("updates.upToDate", "Draft is up to date."),
            null,
            null);
    }

    public static UpdateCheckResult UpdateAvailable(UpdateInfo updateInfo)
    {
        string version = updateInfo.TargetFullRelease.Version.ToString();
        return new UpdateCheckResult(
            UpdateCheckStatus.UpdateAvailable,
            LocalizationService.TranslateFormat(
                "updates.versionAvailable",
                "Draft {version} is available.",
                new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["version"] = version,
                }),
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
