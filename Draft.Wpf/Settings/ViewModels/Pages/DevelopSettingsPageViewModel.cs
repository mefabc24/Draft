using Draft.Dialogs.Message.Models;
using Draft.Dialogs.Message.Services;
using Draft.Dialogs.Prompts.GoToPosition.Models;
using Draft.Dialogs.Prompts.GoToPosition.Services;
using System.Windows.Input;

using Draft.Settings.ViewModels;

namespace Draft.Settings.ViewModels.Pages;

public sealed class DevelopSettingsPageViewModel : SettingsPageViewModel
{
    private const string InstallDemoUpdateResultId = "install-demo-update";
    private readonly IMessageDialogService _dialogService = new MessageDialogService();
    private readonly IGoToPositionPromptService _goToPositionPromptService = new GoToPositionPromptService();
    private bool _isDemoUpdateAvailable;
    private bool _isDemoUpdateChecking;
    private string _demoUpdateStatus = LocalizationService.Translate(
        "settings.develop.demoUpdateStatus.initial",
        "Test card. Scan to simulate an available update.");

    public DevelopSettingsPageViewModel(SettingsWindowViewModel settings)
        : base("settings.develop", "Develop", settings)
    {
        ShowInfoDialogCommand = new RelayCommand(() => ShowDialog(MessageDialogType.Info, InfoDialogButtonCount));
        ShowWarningDialogCommand = new RelayCommand(() => ShowDialog(MessageDialogType.Warning, WarningDialogButtonCount));
        ShowErrorDialogCommand = new RelayCommand(() => ShowDialog(MessageDialogType.Error, ErrorDialogButtonCount));
        ShowSuccessDialogCommand = new RelayCommand(() => ShowDialog(MessageDialogType.Success, SuccessDialogButtonCount));
        ShowPromptWindowCommand = new RelayCommand(ShowPromptWindow);
        RunDemoUpdateActionCommand = new RelayCommand(
            () => _ = RunDemoUpdateActionAsync(),
            () => !_isDemoUpdateChecking);
    }

    public IReadOnlyList<int> DialogButtonCountOptions { get; } = new[] { 1, 2, 3 };

    public int InfoDialogButtonCount { get; set; } = 1;

    public int WarningDialogButtonCount { get; set; } = 1;

    public int ErrorDialogButtonCount { get; set; } = 1;

    public int SuccessDialogButtonCount { get; set; } = 1;

    public ICommand ShowInfoDialogCommand { get; }

    public ICommand ShowWarningDialogCommand { get; }

    public ICommand ShowErrorDialogCommand { get; }

    public ICommand ShowSuccessDialogCommand { get; }

    public ICommand ShowPromptWindowCommand { get; }

    public ICommand RunDemoUpdateActionCommand { get; }

    public string DemoUpdateStatus
    {
        get => _demoUpdateStatus;
        private set => SetProperty(ref _demoUpdateStatus, value);
    }

    public bool IsDemoUpdateAvailable
    {
        get => _isDemoUpdateAvailable;
        private set
        {
            if (SetProperty(ref _isDemoUpdateAvailable, value))
            {
                OnPropertyChanged(nameof(DemoUpdateActionText));
            }
        }
    }

    public bool IsDemoUpdateActionEnabled => !_isDemoUpdateChecking;

    public string DemoUpdateActionText
    {
        get
        {
            if (_isDemoUpdateChecking)
                return LocalizationService.Translate("updates.checking", "Checking...");

            return IsDemoUpdateAvailable
                ? LocalizationService.Translate("updates.install", "Install")
                : LocalizationService.Translate("updates.checkForUpdates", "Check for updates");
        }
    }

    private void ShowPromptWindow()
    {
        _goToPositionPromptService.Show(new GoToPositionPromptRequest(1, 1));
    }

    private async Task RunDemoUpdateActionAsync()
    {
        if (IsDemoUpdateAvailable)
        {
            ShowDemoInstallMessage();
            return;
        }

        SetDemoUpdateChecking(true);
        DemoUpdateStatus = LocalizationService.Translate(
            "updates.checkingForUpdates",
            "Checking for updates...");

        try
        {
            await Task.Delay(350);
            IsDemoUpdateAvailable = true;
            DemoUpdateStatus = LocalizationService.Translate("updates.available", "Update available.");

            MessageDialogResult installResult = _dialogService.ShowMessage(
                new MessageDialogRequest(
                    LocalizationService.Translate("updates.availableTitle", "Update Available"),
                    LocalizationService.Translate(
                        "settings.develop.demoUpdateAvailableDescription",
                        "Draft 99.0.0-test is available. Install this update now? Draft will restart to finish installing."),
                    MessageDialogType.Info,
                    new[]
                    {
                        MessageDialogButtonDefinition.Secondary(
                            LocalizationService.Translate("common.cancel", "Cancel"),
                            MessageDialogResult.Cancel),
                        MessageDialogButtonDefinition.Primary(
                            LocalizationService.Translate("updates.install", "Install"),
                            new MessageDialogResult(InstallDemoUpdateResultId)),
                    }));

            if (installResult.Id == InstallDemoUpdateResultId)
            {
                ShowDemoInstallMessage();
            }
        }
        finally
        {
            SetDemoUpdateChecking(false);
        }
    }

    private void ShowDemoInstallMessage()
    {
        _dialogService.ShowMessage(
            new MessageDialogRequest(
                LocalizationService.Translate("settings.develop.testUpdateCard", "Test update card"),
                LocalizationService.Translate(
                    "settings.develop.demoUpdateInstalledDescription",
                    "This is a development-only update demo. No update was installed."),
                MessageDialogType.Info,
                new[]
                {
                    MessageDialogButtonDefinition.Primary(
                        LocalizationService.Translate("common.okay", "Okay"),
                        MessageDialogResult.Ok),
                }));
    }

    private void SetDemoUpdateChecking(bool value)
    {
        if (SetProperty(ref _isDemoUpdateChecking, value, nameof(IsDemoUpdateActionEnabled)))
        {
            OnPropertyChanged(nameof(DemoUpdateActionText));
            CommandManager.InvalidateRequerySuggested();
        }
    }

    private void ShowDialog(MessageDialogType dialogType, int buttonCount)
    {
        string title = dialogType switch
        {
            MessageDialogType.Info => LocalizationService.Translate(
                "settings.develop.infoDialog.previewTitle",
                "Info Dialog"),
            MessageDialogType.Warning => LocalizationService.Translate("settings.develop.warningDialog.previewTitle", "Warning Dialog"),
            MessageDialogType.Error => LocalizationService.Translate("settings.develop.errorDialog.previewTitle", "Error Dialog"),
            MessageDialogType.Success => LocalizationService.Translate("settings.develop.successDialog.previewTitle", "Success Dialog"),
            _ => LocalizationService.Translate("dialog.title", "Dialog"),
        };

        string description = dialogType switch
        {
            MessageDialogType.Info => LocalizationService.Translate(
                "settings.develop.infoDialog.previewDescription",
                "This is a development preview of an informational dialog."),
            MessageDialogType.Warning => LocalizationService.Translate(
                "settings.develop.warningDialog.previewDescription",
                "This is a development preview of a warning dialog."),
            MessageDialogType.Error => LocalizationService.Translate(
                "settings.develop.errorDialog.previewDescription",
                "This is a development preview of an error dialog."),
            MessageDialogType.Success => LocalizationService.Translate(
                "settings.develop.successDialog.previewDescription",
                "This is a development preview of a success dialog."),
            _ => LocalizationService.Translate(
                "settings.develop.dialog.previewDescription",
                "This is a development preview dialog."),
        };

        _dialogService.ShowMessage(
            new MessageDialogRequest(
                title,
                description,
                dialogType,
                CreateButtonDefinitions(buttonCount)));
    }

    private static IReadOnlyList<MessageDialogButtonDefinition> CreateButtonDefinitions(int buttonCount)
    {
        return buttonCount switch
        {
            2 => new[]
            {
                MessageDialogButtonDefinition.Secondary(
                    LocalizationService.Translate("common.cancel", "Cancel"),
                    MessageDialogResult.Cancel),
                MessageDialogButtonDefinition.Primary(
                    LocalizationService.Translate("common.okay", "Okay"),
                    MessageDialogResult.Ok),
            },
            3 => new[]
            {
                MessageDialogButtonDefinition.Secondary(
                    LocalizationService.Translate("common.cancel", "Cancel"),
                    MessageDialogResult.Cancel),
                MessageDialogButtonDefinition.Secondary(
                    LocalizationService.Translate("common.later", "Later"),
                    new MessageDialogResult("later")),
                MessageDialogButtonDefinition.Primary(
                    LocalizationService.Translate("common.okay", "Okay"),
                    MessageDialogResult.Ok),
            },
            _ => new[]
            {
                MessageDialogButtonDefinition.Primary(
                    LocalizationService.Translate("common.okay", "Okay"),
                    MessageDialogResult.Ok),
            },
        };
    }
}
