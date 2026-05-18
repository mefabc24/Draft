using Draft.Dialogs.Message.Models;
using Draft.Dialogs.Message.Services;
using Draft.Views;
using Draft.ViewModels;
using System.Windows;
using System.Windows.Input;

namespace Draft.Helpers;

public sealed class UpdateCoordinator : BaseViewModel
{
    private const string OpenUpdateSettingsResultId = "open-update-settings";
    private readonly IMessageDialogService _messageDialogService;
    private readonly SemaphoreSlim _operationLock = new(1, 1);
    private readonly UpdateService _updateService;
    private UpdateCheckResult? _availableUpdate;
    private bool _isCheckingForUpdates;
    private bool _isInstallingUpdate;
    private string _statusText = "Updates are checked automatically at launch.";

    public static UpdateCoordinator Current { get; } = new();

    private UpdateCoordinator()
        : this(new UpdateService(), new MessageDialogService())
    {
    }

    internal UpdateCoordinator(
        UpdateService updateService,
        IMessageDialogService messageDialogService)
    {
        _updateService = updateService;
        _messageDialogService = messageDialogService;
    }

    public string StatusText
    {
        get => _statusText;
        private set => SetProperty(ref _statusText, value);
    }

    public bool HasAvailableUpdate => _availableUpdate?.Status == UpdateCheckStatus.UpdateAvailable;

    public bool CanRunUpdateAction => !_isCheckingForUpdates && !_isInstallingUpdate;

    public string ActionButtonText
    {
        get
        {
            if (_isInstallingUpdate)
                return "Installing...";

            if (_isCheckingForUpdates)
                return "Checking...";

            return HasAvailableUpdate ? "Install" : "Check for updates";
        }
    }

    public Task CheckForUpdatesOnLaunchAsync(CancellationToken cancellationToken)
    {
        return CheckForUpdatesAsync(
            showNoUpdateDialog: false,
            showFailureDialog: false,
            promptToInstall: true,
            cancellationToken);
    }

    public async Task RunSettingsActionAsync(CancellationToken cancellationToken)
    {
        if (HasAvailableUpdate)
        {
            await InstallAvailableUpdateAsync(cancellationToken);
            return;
        }

        await CheckForUpdatesAsync(
            showNoUpdateDialog: true,
            showFailureDialog: true,
            promptToInstall: false,
            cancellationToken);
    }

    private async Task CheckForUpdatesAsync(
        bool showNoUpdateDialog,
        bool showFailureDialog,
        bool promptToInstall,
        CancellationToken cancellationToken)
    {
        if (!await _operationLock.WaitAsync(0, cancellationToken))
            return;

        try
        {
            SetCheckingForUpdates(true);
            ClearAvailableUpdate();
            StatusText = "Checking for updates...";

            UpdateCheckResult result = await _updateService.CheckForUpdatesAsync(cancellationToken);

            SetCheckingForUpdates(false);
            HandleUpdateCheckResult(
                result,
                showNoUpdateDialog,
                showFailureDialog,
                promptToInstall);
        }
        catch (OperationCanceledException)
        {
            StatusText = "Update check canceled.";
        }
        finally
        {
            SetCheckingForUpdates(false);
            _operationLock.Release();
        }
    }

    private void HandleUpdateCheckResult(
        UpdateCheckResult result,
        bool showNoUpdateDialog,
        bool showFailureDialog,
        bool promptToInstall)
    {
        switch (result.Status)
        {
            case UpdateCheckStatus.NotInstalledWithVelopack:
            case UpdateCheckStatus.UpToDate:
                ClearAvailableUpdate();
                StatusText = result.Message;

                if (showNoUpdateDialog)
                {
                    ShowMessageDialog(
                        "Check for Updates",
                        result.Message,
                        MessageDialogType.Info);
                }
                return;
            case UpdateCheckStatus.Failed:
                ClearAvailableUpdate();
                StatusText = "Unable to check for updates.";

                if (showFailureDialog)
                {
                    ShowMessageDialog(
                        "Check for Updates",
                        result.Message,
                        MessageDialogType.Error);
                }
                return;
            case UpdateCheckStatus.UpdateAvailable:
                SetAvailableUpdate(result);

                if (promptToInstall)
                {
                    PromptToOpenUpdateSettings(result);
                }
                return;
        }
    }

    private async Task InstallAvailableUpdateAsync(CancellationToken cancellationToken)
    {
        if (!await _operationLock.WaitAsync(0, cancellationToken))
            return;

        try
        {
            if (_availableUpdate is null)
            {
                ClearAvailableUpdate();
                StatusText = "No update available.";
                return;
            }

            await InstallUpdateAsync(_availableUpdate, cancellationToken);
        }
        catch (OperationCanceledException)
        {
            SetAvailableUpdate(_availableUpdate);
        }
        finally
        {
            SetInstallingUpdate(false);
            _operationLock.Release();
        }
    }

    private void PromptToOpenUpdateSettings(UpdateCheckResult result)
    {
        MessageDialogResult installResult = _messageDialogService.ShowMessage(
            new MessageDialogRequest(
                "Update Available",
                $"Draft {result.Version} is available. Open Settings to install it from About?",
                MessageDialogType.Info,
                new[]
                {
                    MessageDialogButtonDefinition.Secondary("Cancel", MessageDialogResult.Cancel),
                    MessageDialogButtonDefinition.Primary("Open Settings", new MessageDialogResult(OpenUpdateSettingsResultId)),
                }));

        SetAvailableUpdate(result);

        if (installResult.Id != OpenUpdateSettingsResultId)
        {
            return;
        }

        OpenAboutSettings();
    }

    private static void OpenAboutSettings()
    {
        Application.Current.Dispatcher.Invoke(() =>
        {
            if (Application.Current.MainWindow is MainWindow mainWindow)
            {
                mainWindow.ShowSettings(SettingsPage.About);
                return;
            }

            SettingsWindow settingsWindow = new(SettingsPage.About)
            {
                WindowStartupLocation = WindowStartupLocation.CenterScreen,
            };
            settingsWindow.ShowDialog();
        });
    }

    private async Task InstallUpdateAsync(
        UpdateCheckResult result,
        CancellationToken cancellationToken)
    {
        if (!CanRestartForUpdate())
        {
            SetAvailableUpdate(result);
            return;
        }

        try
        {
            ClearAvailableUpdate();
            SetInstallingUpdate(true);
            StatusText = "Downloading update...";

            await _updateService.DownloadAndApplyUpdateAsync(
                result,
                progress => Application.Current.Dispatcher.Invoke(() =>
                {
                    StatusText = $"Downloading update... {progress}%";
                }),
                cancellationToken);
        }
        catch (OperationCanceledException)
        {
            SetAvailableUpdate(result);
            throw;
        }
        catch (Exception ex)
        {
            ClearAvailableUpdate();
            StatusText = "Unable to install update.";
            ShowMessageDialog(
                "Install Update",
                $"Unable to install the update. {ex.Message}",
                MessageDialogType.Error);
        }
    }

    private bool CanRestartForUpdate()
    {
        MainWindowViewModel? viewModel =
            Application.Current?.MainWindow?.DataContext as MainWindowViewModel;

        if (viewModel is null || !viewModel.HasUnsavedWork)
            return true;

        ShowMessageDialog(
            "Unsaved Changes",
            "Draft has unsaved work. Save or discard your changes before installing the update.",
            MessageDialogType.Warning);

        return false;
    }

    private void SetAvailableUpdate(UpdateCheckResult? update)
    {
        _availableUpdate = update?.Status == UpdateCheckStatus.UpdateAvailable
            ? update
            : null;
        StatusText = _availableUpdate is null
            ? StatusText
            : "Update available.";

        RaiseUpdateActionPropertiesChanged();
    }

    private void ClearAvailableUpdate()
    {
        if (_availableUpdate is null)
            return;

        _availableUpdate = null;
        RaiseUpdateActionPropertiesChanged();
    }

    private void SetCheckingForUpdates(bool value)
    {
        if (_isCheckingForUpdates == value)
            return;

        _isCheckingForUpdates = value;
        RaiseUpdateActionPropertiesChanged();
    }

    private void SetInstallingUpdate(bool value)
    {
        if (_isInstallingUpdate == value)
            return;

        _isInstallingUpdate = value;
        RaiseUpdateActionPropertiesChanged();
    }

    private void RaiseUpdateActionPropertiesChanged()
    {
        OnPropertyChanged(nameof(HasAvailableUpdate));
        OnPropertyChanged(nameof(CanRunUpdateAction));
        OnPropertyChanged(nameof(ActionButtonText));
        CommandManager.InvalidateRequerySuggested();
    }

    private void ShowMessageDialog(
        string title,
        string description,
        MessageDialogType dialogType)
    {
        _messageDialogService.ShowMessage(
            new MessageDialogRequest(
                title,
                description,
                dialogType,
                new[]
                {
                    MessageDialogButtonDefinition.Primary("Okay", MessageDialogResult.Ok),
                }));
    }
}
