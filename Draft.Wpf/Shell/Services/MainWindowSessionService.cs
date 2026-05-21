using Draft.AppHost.Session;
using Draft.Documents.Models;
using Draft.Shell.ViewModels;
using System.IO;
using System.Security;
using System.Windows;

namespace Draft.Shell.Services;

public sealed class MainWindowSessionService
{
    public AppSessionState Capture(Window window, MainWindowViewModel viewModel)
    {
        Rect bounds = window.WindowState == WindowState.Normal
            ? new Rect(window.Left, window.Top, window.Width, window.Height)
            : window.RestoreBounds;
        string? lastDocumentPath = GetRestorableDocumentPath(viewModel.CurrentFilePath);

        return new AppSessionState(
            bounds.Width,
            bounds.Height,
            bounds.Left,
            bounds.Top,
            viewModel.WorkspaceMode,
            lastDocumentPath);
    }

    public void Apply(Window window, AppSessionState sessionState)
    {
        Rect bounds = new(
            sessionState.WindowLeft,
            sessionState.WindowTop,
            sessionState.WindowWidth,
            sessionState.WindowHeight);

        if (!IsValidWindowBounds(bounds))
            return;

        window.WindowStartupLocation = WindowStartupLocation.Manual;
        window.Left = bounds.Left;
        window.Top = bounds.Top;
        window.Width = bounds.Width;
        window.Height = bounds.Height;
    }

    private static string? GetRestorableDocumentPath(string? filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath))
            return null;

        try
        {
            string fullPath = Path.GetFullPath(filePath);
            return SupportedDocumentTypes.IsSupportedExistingFile(fullPath)
                ? fullPath
                : null;
        }
        catch (Exception ex) when (IsFileOperationException(ex))
        {
            return null;
        }
    }

    private static bool IsValidWindowBounds(Rect bounds)
    {
        if (bounds.Width < 480 || bounds.Height < 320)
            return false;

        Rect virtualScreen = new(
            SystemParameters.VirtualScreenLeft,
            SystemParameters.VirtualScreenTop,
            SystemParameters.VirtualScreenWidth,
            SystemParameters.VirtualScreenHeight);

        return bounds.IntersectsWith(virtualScreen);
    }

    private static bool IsFileOperationException(Exception ex)
    {
        return ex is IOException
            or UnauthorizedAccessException
            or ArgumentException
            or NotSupportedException
            or PathTooLongException
            or SecurityException
            or InvalidOperationException;
    }
}
