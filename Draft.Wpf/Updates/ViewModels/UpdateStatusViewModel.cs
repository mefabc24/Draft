using Draft.Updates.Models;
using System.Windows.Input;

namespace Draft.Updates.ViewModels;

public sealed class UpdateStatusViewModel : BaseViewModel
{
    private UpdateCheckResult? _availableUpdate;
    private bool _isCheckingForUpdates;
    private bool _isInstallingUpdate;
    private string _statusText = LocalizationService.Translate(
        "updates.checkedAutomatically",
        "Updates are checked automatically at launch.");

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
                return LocalizationService.Translate("updates.installing", "Installing...");

            if (_isCheckingForUpdates)
                return LocalizationService.Translate("updates.checking", "Checking...");

            return HasAvailableUpdate
                ? LocalizationService.Translate("updates.install", "Install")
                : LocalizationService.Translate("updates.checkForUpdates", "Check for updates");
        }
    }

    internal UpdateCheckResult? AvailableUpdate => _availableUpdate;

    internal void SetStatusText(string value)
    {
        StatusText = value;
    }

    internal void SetAvailableUpdate(UpdateCheckResult? update)
    {
        _availableUpdate = update?.Status == UpdateCheckStatus.UpdateAvailable
            ? update
            : null;
        StatusText = _availableUpdate is null
            ? StatusText
            : LocalizationService.Translate("updates.available", "Update available.");

        RaiseUpdateActionPropertiesChanged();
    }

    internal void ClearAvailableUpdate()
    {
        if (_availableUpdate is null)
            return;

        _availableUpdate = null;
        RaiseUpdateActionPropertiesChanged();
    }

    internal void SetCheckingForUpdates(bool value)
    {
        if (_isCheckingForUpdates == value)
            return;

        _isCheckingForUpdates = value;
        RaiseUpdateActionPropertiesChanged();
    }

    internal void SetInstallingUpdate(bool value)
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
}
