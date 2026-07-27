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

        bool shouldOpenAboutSettings = false;

        try
        {
            _status.SetCheckingForUpdates(true);
            _status.ClearAvailableUpdate();
            SetStatusText(LocalizationService.Translate("updates.checkingForUpdates", "Checking for updates..."));

            UpdateCheckResult result = await _updateService.CheckForUpdatesAsync(cancellationToken);

            _status.SetCheckingForUpdates(false);
            shouldOpenAboutSettings = HandleUpdateCheckResult(
                result,
                showNoUpdateDialog,
                showFailureDialog,
                promptToInstall);
        }
        catch (OperationCanceledException)
        {
            SetStatusText(LocalizationService.Translate("updates.checkCanceled", "Update check canceled."));
        }
        finally
        {
            _status.SetCheckingForUpdates(false);
            _operationLock.Release();
        }

        if (shouldOpenAboutSettings)
        {
            _interactionService.OpenAboutSettings();
        }
    }

    private bool HandleUpdateCheckResult(
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
                        LocalizationService.Translate("updates.checkForUpdatesTitle", "Check for Updates"),
                        result.Message,
                        MessageDialogType.Info);
                }
                return false;
            case UpdateCheckStatus.Failed:
                _status.ClearAvailableUpdate();
                SetStatusText(LocalizationService.Translate(
                    "updates.checkFailed",
                    "Unable to check for updates."));

                if (showFailureDialog)
                {
                    _interactionService.ShowMessage(
                        LocalizationService.Translate("updates.checkForUpdatesTitle", "Check for Updates"),
                        result.Message,
                        MessageDialogType.Error);
                }
                return false;
            case UpdateCheckStatus.UpdateAvailable:
                _status.SetAvailableUpdate(result);
                return promptToInstall
                    && _interactionService.PromptToOpenUpdateSettings(result);
            default:
                return false;
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
                SetStatusText(LocalizationService.Translate("updates.noneAvailable", "No update available."));
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
            SetStatusText(LocalizationService.Translate("updates.downloading", "Downloading update..."));

            await _updateService.DownloadAndApplyUpdateAsync(
                result,
                progress => _interactionService.InvokeOnUiThread(() =>
                {
                    SetStatusText(LocalizationService.TranslateFormat(
                        "updates.downloadingProgress",
                        "Downloading update... {progress}%",
                        new Dictionary<string, string>(StringComparer.Ordinal)
                        {
                            ["progress"] = progress.ToString(),
                        }));
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
            SetStatusText(LocalizationService.Translate("updates.installFailed", "Unable to install update."));
            _interactionService.ShowMessage(
                LocalizationService.Translate("updates.installTitle", "Install Update"),
                LocalizationService.TranslateFormat(
                    "updates.installFailedDescription",
                    "Unable to install the update. {message}",
                    new Dictionary<string, string>(StringComparer.Ordinal)
                    {
                        ["message"] = ex.Message,
                    }),
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
