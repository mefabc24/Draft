using Draft.AppHost.Session;
using Draft.Dialogs.Message.Models;
using Draft.Dialogs.Message.Services;
using Draft.Save.Services;
using Draft.Settings.Models;
using Draft.Settings.Services;
using Draft.Shell.ViewModels;
using Draft.Shell.Views;
using Draft.Updates.Services;
using System.Windows;

namespace Draft.AppHost.Startup;

public sealed class AppStartupService
{
    private readonly IMessageDialogService _messageDialogService;
    private readonly SnapshotCleanupService _snapshotCleanupService;
    private readonly StartupDocumentResolver _startupDocumentResolver;
    private readonly StartupWorkspaceModeResolver _startupWorkspaceModeResolver;

    public AppStartupService()
        : this(
            new StartupDocumentResolver(),
            new StartupWorkspaceModeResolver(),
            new SnapshotCleanupService(),
            new MessageDialogService())
    {
    }

    public AppStartupService(
        StartupDocumentResolver startupDocumentResolver,
        StartupWorkspaceModeResolver startupWorkspaceModeResolver,
        SnapshotCleanupService snapshotCleanupService,
        IMessageDialogService messageDialogService)
    {
        _startupDocumentResolver = startupDocumentResolver;
        _startupWorkspaceModeResolver = startupWorkspaceModeResolver;
        _snapshotCleanupService = snapshotCleanupService;
        _messageDialogService = messageDialogService;
    }

    public void Start(Application application, StartupEventArgs e)
    {
        DraftSettings settings = AppSettingsStore.Load();
        LocalizationService.SetCurrentAppLanguage(settings.AppLanguage);
        _ = _snapshotCleanupService.CleanupOldSnapshotsAsync();

        if (settings.AssociateTxtFilesWithDraft)
        {
            FileAssociationService.TryApplyTextAssociations(true);
        }

        MainWindowViewModel viewModel = new();
        viewModel.ApplySettings(settings);
        AppSessionStateStore.TryLoad(out AppSessionState? sessionState);

        string? startupFilePath = _startupDocumentResolver.GetStartupFilePath(e.Args);
        _startupWorkspaceModeResolver.ApplyStartupWorkspaceMode(viewModel, settings, sessionState);

        if (startupFilePath is not null)
        {
            try
            {
                viewModel.LoadDocumentFromPath(startupFilePath);
            }
            catch (Exception ex) when (_startupDocumentResolver.IsFileOperationException(ex))
            {
                ShowStartupFileError(ex.Message);
            }
        }
        else if (settings.ReopenLastWorkspaceOnStartup
            && _startupDocumentResolver.TryGetRestorableSessionFilePath(sessionState, out string? sessionFilePath))
        {
            _startupDocumentResolver.TryLoadReopenedDocument(viewModel, sessionFilePath);
        }

        MainWindow window = new(viewModel, settings);
        if (sessionState is not null)
        {
            window.ApplySessionState(sessionState);
        }

        application.MainWindow = window;
        window.Show();

        if (settings.CheckForUpdatesOnStartup)
        {
            _ = UpdateCoordinator.Current.CheckForUpdatesOnLaunchAsync(CancellationToken.None);
        }
    }

    private void ShowStartupFileError(string message)
    {
        _messageDialogService.ShowMessage(
            new MessageDialogRequest(
                LocalizationService.Translate("dialog.openFile.title", "Open File"),
                LocalizationService.TranslateFormat(
                    "errors.openStartupFile",
                    "Unable to open the startup file. {message}",
                    new Dictionary<string, string>(StringComparer.Ordinal)
                    {
                        ["message"] = message,
                    }),
                MessageDialogType.Error,
                new[]
                {
                    MessageDialogButtonDefinition.Primary(
                        LocalizationService.Translate("common.okay", "Okay"),
                        MessageDialogResult.Ok),
                }));
    }
}
