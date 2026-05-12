using Draft.Dialogs.Message.Models;
using Draft.Dialogs.Message.Services;
using Draft.Helpers;
using Draft.ViewModels;
using Draft.Views;
using System.IO;
using System.Security;
using System.Windows;
using Velopack;

namespace Draft;

public partial class App : Application
{
    [STAThread]
    public static void Main(string[] args)
    {
        VelopackApp.Build()
            .OnAfterInstallFastCallback(_ => FileAssociationService.TryRegisterMarkdownAssociations())
            .OnAfterUpdateFastCallback(_ => FileAssociationService.TryRegisterMarkdownAssociations())
            .OnBeforeUninstallFastCallback(_ => FileAssociationService.TryUnregisterMarkdownAssociations())
            .Run();

        App app = new();
        app.InitializeComponent();
        app.Run();
    }

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        DraftSettings settings = AppSettingsStore.Load();
        if (settings.AssociateTxtFilesWithDraft)
        {
            FileAssociationService.TryApplyTextAssociations(true);
        }

        MainWindowViewModel viewModel = new();
        viewModel.ApplySettings(settings);
        AppSessionStateStore.TryLoad(out AppSessionState? sessionState);

        string? startupFilePath = GetStartupFilePath(e.Args);
        ApplyStartupWorkspaceMode(viewModel, settings, sessionState);

        if (startupFilePath is not null)
        {
            try
            {
                viewModel.LoadDocumentFromPath(startupFilePath);
            }
            catch (Exception ex) when (IsFileOperationException(ex))
            {
                ShowStartupFileError(ex.Message);
            }
        }
        else if (settings.ReopenLastWorkspaceOnStartup
            && TryGetRestorableSessionFilePath(sessionState, out string? sessionFilePath))
        {
            TryLoadReopenedDocument(viewModel, sessionFilePath);
        }

        MainWindow window = new(viewModel, settings);
        if (sessionState is not null)
        {
            window.ApplySessionState(sessionState);
        }

        MainWindow = window;
        window.Show();
    }

    private static void ApplyStartupWorkspaceMode(
        MainWindowViewModel viewModel,
        DraftSettings settings,
        AppSessionState? sessionState)
    {
        if (settings.DefaultStartupMode == "Last")
        {
            if (!string.IsNullOrWhiteSpace(sessionState?.WorkspaceMode))
            {
                viewModel.SetWorkspaceMode(sessionState.WorkspaceMode);
            }
            return;
        }

        viewModel.SetWorkspaceMode(settings.DefaultStartupMode.ToLowerInvariant());
    }

    private static bool TryGetRestorableSessionFilePath(
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

    private static bool TryLoadReopenedDocument(MainWindowViewModel viewModel, string path)
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

    private static void ShowStartupFileError(string message)
    {
        IMessageDialogService dialogService = new MessageDialogService();
        dialogService.ShowMessage(
            new MessageDialogRequest(
                "Open File",
                $"Unable to open the startup file. {message}",
                MessageDialogType.Error,
                new[]
                {
                    MessageDialogButtonDefinition.Primary("Okay", MessageDialogResult.Ok),
                }));
    }
}
