using Draft.AppHost.Session;
using Draft.Documents.Models;
using Draft.Shell.ViewModels;
using System.IO;
using System.Security;

namespace Draft.AppHost.Startup;

public sealed class StartupDocumentResolver
{
    public string? GetStartupFilePath(IEnumerable<string> args)
    {
        foreach (string arg in args)
        {
            try
            {
                string path = Path.GetFullPath(arg);

                if (SupportedDocumentTypes.IsSupportedExistingFile(path))
                    return path;
            }
            catch (Exception ex) when (IsStartupArgumentException(ex))
            {
                continue;
            }
        }

        return null;
    }

    public bool TryGetRestorableSessionFilePath(
        AppSessionState? sessionState,
        out string filePath)
    {
        filePath = string.Empty;

        if (string.IsNullOrWhiteSpace(sessionState?.LastDocumentPath))
            return false;

        try
        {
            string path = Path.GetFullPath(sessionState.LastDocumentPath);

            if (!SupportedDocumentTypes.IsSupportedExistingFile(path))
                return false;

            filePath = path;
            return true;
        }
        catch (Exception ex) when (IsStartupArgumentException(ex))
        {
            return false;
        }
    }

    public bool TryLoadReopenedDocument(MainWindowViewModel viewModel, string path)
    {
        try
        {
            viewModel.LoadDocumentFromPath(path);
            return true;
        }
        catch (Exception ex) when (IsFileOperationException(ex))
        {
            return false;
        }
    }

    public bool IsFileOperationException(Exception ex)
    {
        return ex is IOException
            or UnauthorizedAccessException
            or NotSupportedException
            or SecurityException;
    }

    private static bool IsStartupArgumentException(Exception ex)
    {
        return ex is ArgumentException
            or NotSupportedException
            or PathTooLongException
            or SecurityException;
    }
}
