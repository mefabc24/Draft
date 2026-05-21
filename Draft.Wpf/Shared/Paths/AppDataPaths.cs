using System.IO;

namespace Draft.Shared.Paths;

public static class AppDataPaths
{
    public static string DraftAppDataDirectory { get; } = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "Draft");

    public static string SettingsFilePath => Path.Combine(DraftAppDataDirectory, "settings.json");

    public static string SessionStateFilePath => Path.Combine(DraftAppDataDirectory, "session-state.json");

    public static string SnapshotsDirectory => Path.Combine(DraftAppDataDirectory, "Snapshots");

    public static string SnapshotCleanupStateFilePath => Path.Combine(DraftAppDataDirectory, "snapshot-cleanup.json");
}
