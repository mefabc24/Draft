using System.IO;
using System.Security;
using System.Text.Json;

namespace Draft.Helpers;

public sealed record AppSessionState(
    double WindowWidth,
    double WindowHeight,
    double WindowLeft,
    double WindowTop,
    string WorkspaceMode);

public static class AppSessionStateStore
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
    };

    private static readonly string SessionStateFilePath = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "Draft",
        "session-state.json");

    public static bool TryLoad(out AppSessionState? sessionState)
    {
        sessionState = null;

        try
        {
            if (!File.Exists(SessionStateFilePath))
                return false;

            string json = File.ReadAllText(SessionStateFilePath);
            sessionState = JsonSerializer.Deserialize<AppSessionState>(json, JsonOptions);

            return sessionState is not null;
        }
        catch (Exception ex) when (IsPersistenceException(ex))
        {
            sessionState = null;
            return false;
        }
    }

    public static bool TrySave(AppSessionState sessionState)
    {
        try
        {
            string? directoryPath = Path.GetDirectoryName(SessionStateFilePath);

            if (!string.IsNullOrWhiteSpace(directoryPath))
            {
                Directory.CreateDirectory(directoryPath);
            }

            string json = JsonSerializer.Serialize(sessionState, JsonOptions);
            File.WriteAllText(SessionStateFilePath, json);

            return true;
        }
        catch (Exception ex) when (IsPersistenceException(ex))
        {
            return false;
        }
    }

    private static bool IsPersistenceException(Exception ex)
    {
        return ex is IOException
            or UnauthorizedAccessException
            or NotSupportedException
            or SecurityException
            or JsonException;
    }
}
