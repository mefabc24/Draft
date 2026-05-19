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
    private string _demoUpdateStatus = "Test card. Scan to simulate an available update.";

    public DevelopSettingsPageViewModel(SettingsWindowViewModel settings)
        : base("Develop", settings)
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
                return "Checking...";

            return IsDemoUpdateAvailable ? "Install" : "Check for updates";
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
        DemoUpdateStatus = "Checking for updates...";

        try
        {
            await Task.Delay(350);
            IsDemoUpdateAvailable = true;
            DemoUpdateStatus = "Update available.";

            MessageDialogResult installResult = _dialogService.ShowMessage(
                new MessageDialogRequest(
                    "Update Available",
                    "Draft 99.0.0-test is available. Install this update now? Draft will restart to finish installing.",
                    MessageDialogType.Info,
                    new[]
                    {
                        MessageDialogButtonDefinition.Secondary("Cancel", MessageDialogResult.Cancel),
                        MessageDialogButtonDefinition.Primary("Install", new MessageDialogResult(InstallDemoUpdateResultId)),
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
                "Test Update Card",
                "This is a development-only update demo. No update was installed.",
                MessageDialogType.Info,
                new[]
                {
                    MessageDialogButtonDefinition.Primary("Okay", MessageDialogResult.Ok),
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
            MessageDialogType.Info => "Info Dialog",
            MessageDialogType.Warning => "Warning Dialog",
            MessageDialogType.Error => "Error Dialog",
            MessageDialogType.Success => "Success Dialog",
            _ => "Dialog",
        };

        string description = dialogType switch
        {
            MessageDialogType.Info => "This is a development preview of an informational dialog.",
            MessageDialogType.Warning => "This is a development preview of a warning dialog.",
            MessageDialogType.Error => "This is a development preview of an error dialog.",
            MessageDialogType.Success => "This is a development preview of a success dialog.",
            _ => "This is a development preview dialog.",
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
                MessageDialogButtonDefinition.Secondary("Cancel", MessageDialogResult.Cancel),
                MessageDialogButtonDefinition.Primary("Okay", MessageDialogResult.Ok),
            },
            3 => new[]
            {
                MessageDialogButtonDefinition.Secondary("Cancel", MessageDialogResult.Cancel),
                MessageDialogButtonDefinition.Secondary("Later", new MessageDialogResult("later")),
                MessageDialogButtonDefinition.Primary("Okay", MessageDialogResult.Ok),
            },
            _ => new[]
            {
                MessageDialogButtonDefinition.Primary("Okay", MessageDialogResult.Ok),
            },
        };
    }
}
