using Draft.Dialogs.Message.Models;
using Draft.Updates.Models;
using Draft.Updates.ViewModels;
using System.ComponentModel;

namespace Draft.Updates.Services;

public sealed class UpdateCoordinator : BaseViewModel
{
    private readonly UpdateInteractionService _interactionService;
    private readonly SemaphoreSlim _operationLock = new(1, 1);
    private readonly UpdateStatusViewModel _status;
    private readonly UpdateService _updateService;

    public static UpdateCoordinator Current { get; } = new();

    private UpdateCoordinator()
        : this(new UpdateService(), new UpdateInteractionService(), new UpdateStatusViewModel())
    {
    }

    internal UpdateCoordinator(
        UpdateService updateService,
        UpdateInteractionService interactionService,
        UpdateStatusViewModel status)
    {
        _updateService = updateService;
        _interactionService = interactionService;
        _status = status;
        _status.PropertyChanged += StatusOnPropertyChanged;
    }

    public UpdateStatusViewModel Status => _status;

    public string StatusText => _status.StatusText;

    public bool HasAvailableUpdate => _status.HasAvailableUpdate;

    public bool CanRunUpdateAction => _status.CanRunUpdateAction;

    public string ActionButtonText => _status.ActionButtonText;

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
        if (_status.HasAvailableUpdate)
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
            _status.SetCheckingForUpdates(true);
            _status.ClearAvailableUpdate();
            SetStatusText("Checking for updates...");

            UpdateCheckResult result = await _updateService.CheckForUpdatesAsync(cancellationToken);

            _status.SetCheckingForUpdates(false);
            HandleUpdateCheckResult(
                result,
                showNoUpdateDialog,
                showFailureDialog,
                promptToInstall);
        }
        catch (OperationCanceledException)
        {
            SetStatusText("Update check canceled.");
        }
        finally
        {
            _status.SetCheckingForUpdates(false);
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
                _status.ClearAvailableUpdate();
                SetStatusText(result.Message);

                if (showNoUpdateDialog)
                {
                    _interactionService.ShowMessage(
                        "Check for Updates",
                        result.Message,
                        MessageDialogType.Info);
                }
                return;
            case UpdateCheckStatus.Failed:
                _status.ClearAvailableUpdate();
                SetStatusText("Unable to check for updates.");

                if (showFailureDialog)
                {
                    _interactionService.ShowMessage(
                        "Check for Updates",
                        result.Message,
                        MessageDialogType.Error);
                }
                return;
            case UpdateCheckStatus.UpdateAvailable:
                _status.SetAvailableUpdate(result);

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
            if (_status.AvailableUpdate is null)
            {
                _status.ClearAvailableUpdate();
                SetStatusText("No update available.");
                return;
            }

            await InstallUpdateAsync(_status.AvailableUpdate, cancellationToken);
        }
        catch (OperationCanceledException)
        {
            _status.SetAvailableUpdate(_status.AvailableUpdate);
        }
        finally
        {
            _status.SetInstallingUpdate(false);
            _operationLock.Release();
        }
    }

    private void PromptToOpenUpdateSettings(UpdateCheckResult result)
    {
        _status.SetAvailableUpdate(result);

        if (!_interactionService.PromptToOpenUpdateSettings(result))
        {
            return;
        }

        _interactionService.OpenAboutSettings();
    }

    private async Task InstallUpdateAsync(
        UpdateCheckResult result,
        CancellationToken cancellationToken)
    {
        if (!_interactionService.CanRestartForUpdate())
        {
            _status.SetAvailableUpdate(result);
            return;
        }

        try
        {
            _status.ClearAvailableUpdate();
            _status.SetInstallingUpdate(true);
            SetStatusText("Downloading update...");

            await _updateService.DownloadAndApplyUpdateAsync(
                result,
                progress => _interactionService.InvokeOnUiThread(() =>
                {
                    SetStatusText($"Downloading update... {progress}%");
                }),
                cancellationToken);
        }
        catch (OperationCanceledException)
        {
            _status.SetAvailableUpdate(result);
            throw;
        }
        catch (Exception ex)
        {
            _status.ClearAvailableUpdate();
            SetStatusText("Unable to install update.");
            _interactionService.ShowMessage(
                "Install Update",
                $"Unable to install the update. {ex.Message}",
                MessageDialogType.Error);
        }
    }

    private void SetStatusText(string value)
    {
        _status.SetStatusText(value);
    }

    private void StatusOnPropertyChanged(object? sender, PropertyChangedEventArgs e)
    {
        switch (e.PropertyName)
        {
            case nameof(UpdateStatusViewModel.StatusText):
                OnPropertyChanged(nameof(StatusText));
                break;
            case nameof(UpdateStatusViewModel.HasAvailableUpdate):
                OnPropertyChanged(nameof(HasAvailableUpdate));
                break;
            case nameof(UpdateStatusViewModel.CanRunUpdateAction):
                OnPropertyChanged(nameof(CanRunUpdateAction));
                break;
            case nameof(UpdateStatusViewModel.ActionButtonText):
                OnPropertyChanged(nameof(ActionButtonText));
                break;
        }
    }
}
