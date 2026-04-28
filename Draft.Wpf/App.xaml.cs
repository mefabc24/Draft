using Draft.Helpers;
using Draft.ViewModels;
using Draft.Views;
using System.IO;
using System.Security;
using System.Windows;

namespace Draft;

public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        MainWindowViewModel viewModel = new();
        string? startupFilePath = GetStartupFilePath(e.Args);

        if (startupFilePath is not null)
        {
            try
            {
                viewModel.LoadDocumentFromPath(startupFilePath);
            }
            catch (Exception ex) when (IsFileOperationException(ex))
            {
                MessageBox.Show(
                    $"Unable to open the startup file.\n\n{ex.Message}",
                    "Open File",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
            }
        }

        MainWindow window = new(viewModel);
        MainWindow = window;
        window.Show();
    }

    private static string? GetStartupFilePath(IEnumerable<string> args)
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

    private static bool IsStartupArgumentException(Exception ex)
    {
        return ex is ArgumentException
            or NotSupportedException
            or PathTooLongException
            or SecurityException;
    }

    private static bool IsFileOperationException(Exception ex)
    {
        return ex is IOException
            or UnauthorizedAccessException
            or NotSupportedException
            or SecurityException;
    }
}
