using Draft.Dialogs.Prompt.AutosavePrompt.Models;
using Draft.Helpers;
using Draft.ViewModels;
using System.Windows.Input;

namespace Draft.Dialogs.Prompt.AutosavePrompt.ViewModels;

public sealed class AutosavePromptViewModel : BaseViewModel
{
    private readonly bool _initialAutosaveEnabled;
    private bool _autosaveEnabled;
    private bool _hasAppliedOpenedFeedback;
    private string _autosaveInterval = "10s";

    public AutosavePromptViewModel(AutosavePromptRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        _initialAutosaveEnabled = request.AutosaveEnabled;
        _autosaveEnabled = request.AutosaveEnabled;
        _autosaveInterval = EnsureAutosaveInterval(request.AutosaveInterval);

        ConfirmCommand = new RelayCommand(Confirm);
        CancelCommand = new RelayCommand(Cancel);
    }

    public IReadOnlyList<string> AutosaveIntervalOptions => SettingsViewModel.AutosaveIntervalOptionValues;

    public bool AutosaveEnabled
    {
        get => _autosaveEnabled;
        set
        {
            if (SetProperty(ref _autosaveEnabled, value))
            {
                OnPropertyChanged(nameof(IsAutosaveIntervalEnabled));
            }
        }
    }

    public bool IsAutosaveIntervalEnabled => AutosaveEnabled;

    public string AutosaveInterval
    {
        get => _autosaveInterval;
        set => SetProperty(ref _autosaveInterval, EnsureAutosaveInterval(value));
    }

    public AutosavePromptResult Result { get; private set; } = AutosavePromptResult.Cancelled;

    public ICommand ConfirmCommand { get; }

    public ICommand CancelCommand { get; }

    public event EventHandler? CloseRequested;

    public void ApplyOpenedFeedback()
    {
        if (_hasAppliedOpenedFeedback)
            return;

        _hasAppliedOpenedFeedback = true;

        if (!_initialAutosaveEnabled)
        {
            AutosaveEnabled = true;
        }
    }

    private void Confirm()
    {
        Result = AutosavePromptResult.Confirmed(AutosaveEnabled, AutosaveInterval);
        CloseRequested?.Invoke(this, EventArgs.Empty);
    }

    private void Cancel()
    {
        Result = AutosavePromptResult.Cancelled;
        CloseRequested?.Invoke(this, EventArgs.Empty);
    }

    private static string EnsureAutosaveInterval(string? value)
    {
        return SettingsViewModel.AutosaveIntervalOptionValues.Contains(value ?? string.Empty)
            ? value!
            : "10s";
    }
}
