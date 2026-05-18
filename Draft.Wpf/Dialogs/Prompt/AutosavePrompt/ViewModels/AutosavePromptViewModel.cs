using Draft.Dialogs.Prompt.AutosavePrompt.Models;
using Draft.Helpers;
using Draft.ViewModels;
using System.Windows.Input;

namespace Draft.Dialogs.Prompt.AutosavePrompt.ViewModels;

public sealed class AutosavePromptViewModel : BaseViewModel
{
    private bool _autosaveEnabled;
    private string _autosaveInterval = "10s";

    public AutosavePromptViewModel(AutosavePromptRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

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
