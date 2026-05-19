using Draft.Dialogs.Prompts.RevertSave.Models;
using Draft.Dialogs.Prompts.RevertSave.Services;
using Draft.Save.Models;
using System.Windows.Input;

namespace Draft.Dialogs.Prompts.RevertSave.ViewModels;

public sealed class RevertSaveViewModel : BaseViewModel
{
    private readonly ManualSaveSnapshot? _lastManualSnapshot;
    private readonly AutosaveSnapshot? _lastAutosaveSnapshot;
    private readonly RevertSaveOptionFormatter _optionFormatter;
    private RevertSaveOptionKind _selectedVersion = RevertSaveOptionKind.LastAutosave;

    public RevertSaveViewModel(
        RevertSavePromptRequest request,
        RevertSaveOptionProvider optionProvider,
        RevertSaveOptionFormatter optionFormatter)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(optionProvider);
        ArgumentNullException.ThrowIfNull(optionFormatter);

        _optionFormatter = optionFormatter;
        RevertSaveOptionSet options = optionProvider.Load(request.FilePath);
        _lastManualSnapshot = options.LastManualSnapshot;
        _lastAutosaveSnapshot = options.LastAutosaveSnapshot;

        LastManualSaveCard = CreateLastManualSaveCard(options.LastManualIsLatest);
        LastAutosaveCard = CreateLastAutosaveCard(options.LastAutosaveIsLatest);

        RestoreSelectionCommand = new RelayCommand(RestoreSelection, () => CanRestoreSelection);
        CancelCommand = new RelayCommand(Cancel);

        if (LastManualSaveCard.IsLatest && LastManualSaveCard.IsAvailable)
        {
            LastManualSaveCard.IsSelected = true;
        }
        else if (LastAutosaveCard.IsLatest && LastAutosaveCard.IsAvailable)
        {
            LastAutosaveCard.IsSelected = true;
        }
        else if (LastManualSaveCard.IsAvailable)
        {
            LastManualSaveCard.IsSelected = true;
        }
    }

    public RevertSaveOptionViewModel LastManualSaveCard { get; }

    public RevertSaveOptionViewModel LastAutosaveCard { get; }

    public RevertSaveOptionKind SelectedVersion
    {
        get => _selectedVersion;
        private set
        {
            if (!SetProperty(ref _selectedVersion, value))
                return;

            OnPropertyChanged(nameof(CanRestoreSelection));
            CommandManager.InvalidateRequerySuggested();
        }
    }

    public bool CanRestoreSelection => SelectedVersion switch
    {
        RevertSaveOptionKind.LastManualSave => _lastManualSnapshot is not null,
        RevertSaveOptionKind.LastAutosave => _lastAutosaveSnapshot is not null,
        _ => false,
    };

    public RevertSavePromptResult Result { get; private set; } = RevertSavePromptResult.Cancelled;

    public ICommand RestoreSelectionCommand { get; }

    public ICommand CancelCommand { get; }

    public event EventHandler? CloseRequested;

    private RevertSaveOptionViewModel CreateLastManualSaveCard(bool isLatest)
    {
        if (_lastManualSnapshot is null)
        {
            return new RevertSaveOptionViewModel(
                RevertSaveOptionKind.LastManualSave,
                "LAST MANUAL SAVE",
                "Unavailable",
                "Save manually to create a restore point.",
                false,
                false,
                "No manual save snapshot exists for this file.",
                SelectOption);
        }

        return new RevertSaveOptionViewModel(
            RevertSaveOptionKind.LastManualSave,
            "LAST MANUAL SAVE",
            _optionFormatter.FormatWordCount(_lastManualSnapshot.Metadata.WordCount),
            _optionFormatter.FormatVersionTimestamp("Saved", _lastManualSnapshot.Metadata.UpdatedAtUtc),
            isLatest,
            true,
            string.Empty,
            SelectOption);
    }

    private RevertSaveOptionViewModel CreateLastAutosaveCard(bool isLatest)
    {
        if (_lastAutosaveSnapshot is null)
        {
            return new RevertSaveOptionViewModel(
                RevertSaveOptionKind.LastAutosave,
                "LAST AUTOSAVE",
                "Unavailable",
                "Autosave has not created a restore point for this file.",
                false,
                false,
                "No autosave snapshot exists for this file.",
                SelectOption);
        }

        return new RevertSaveOptionViewModel(
            RevertSaveOptionKind.LastAutosave,
            "LAST AUTOSAVE",
            _optionFormatter.FormatWordCount(_lastAutosaveSnapshot.Metadata.WordCount),
            _optionFormatter.FormatVersionTimestamp("Auto-saved", _lastAutosaveSnapshot.Metadata.UpdatedAtUtc),
            isLatest,
            true,
            string.Empty,
            SelectOption);
    }

    private void SelectOption(RevertSaveOptionViewModel option)
    {
        if (!option.IsAvailable)
            return;

        SelectedVersion = option.OptionKind;

        if (!ReferenceEquals(option, LastManualSaveCard))
        {
            LastManualSaveCard.IsSelected = false;
        }

        if (!ReferenceEquals(option, LastAutosaveCard))
        {
            LastAutosaveCard.IsSelected = false;
        }
    }

    private void RestoreSelection()
    {
        if (SelectedVersion == RevertSaveOptionKind.LastAutosave)
        {
            if (_lastAutosaveSnapshot is null)
                return;

            Result = RevertSavePromptResult.LastAutosave(_lastAutosaveSnapshot.Content);
            CloseRequested?.Invoke(this, EventArgs.Empty);
            return;
        }

        if (_lastManualSnapshot is null)
            return;

        Result = RevertSavePromptResult.LastManualSave(_lastManualSnapshot.Content);
        CloseRequested?.Invoke(this, EventArgs.Empty);
    }

    private void Cancel()
    {
        Result = RevertSavePromptResult.Cancelled;
        CloseRequested?.Invoke(this, EventArgs.Empty);
    }

}
