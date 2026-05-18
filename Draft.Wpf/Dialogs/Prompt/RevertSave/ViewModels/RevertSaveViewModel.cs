using Draft.Dialogs.Prompt.RevertSave.Models;
using Draft.Helpers;
using Draft.Models.Save;
using Draft.Services.Save;
using System.Windows.Input;

namespace Draft.Dialogs.Prompt.RevertSave.ViewModels;

public sealed class RevertSaveViewModel : BaseViewModel
{
    private readonly ManualSaveSnapshot? _lastManualSnapshot;
    private readonly AutosaveSnapshot? _lastAutosaveSnapshot;
    private RevertSaveOptionKind _selectedVersion = RevertSaveOptionKind.LastAutosave;

    public RevertSaveViewModel(
        RevertSavePromptRequest request,
        ManualSaveSnapshotService manualSaveSnapshotService,
        AutosaveSnapshotService autosaveSnapshotService)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(manualSaveSnapshotService);
        ArgumentNullException.ThrowIfNull(autosaveSnapshotService);

        _lastManualSnapshot = string.IsNullOrWhiteSpace(request.FilePath)
            ? null
            : manualSaveSnapshotService.LoadManualSnapshot(request.FilePath);
        _lastAutosaveSnapshot = string.IsNullOrWhiteSpace(request.FilePath)
            ? null
            : autosaveSnapshotService.LoadAutosaveSnapshot(request.FilePath);

        DateTimeOffset? manualTimestamp = _lastManualSnapshot?.Metadata.UpdatedAtUtc;
        DateTimeOffset? autosaveTimestamp = _lastAutosaveSnapshot?.Metadata.UpdatedAtUtc;
        bool manualIsLatest = manualTimestamp is not null
            && (autosaveTimestamp is null || manualTimestamp.Value > autosaveTimestamp.Value);
        bool autosaveIsLatest = autosaveTimestamp is not null
            && (manualTimestamp is null || autosaveTimestamp.Value >= manualTimestamp.Value);

        LastManualSaveCard = CreateLastManualSaveCard(manualIsLatest);
        LastAutosaveCard = CreateLastAutosaveCard(autosaveIsLatest);

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
            FormatWordCount(_lastManualSnapshot.Metadata.WordCount),
            FormatVersionTimestamp("Saved", _lastManualSnapshot.Metadata.UpdatedAtUtc),
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
            FormatWordCount(_lastAutosaveSnapshot.Metadata.WordCount),
            FormatVersionTimestamp("Auto-saved", _lastAutosaveSnapshot.Metadata.UpdatedAtUtc),
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

    private static string FormatWordCount(int wordCount)
    {
        return wordCount == 1 ? "1 word" : $"{wordCount:N0} words";
    }

    private static string FormatVersionTimestamp(string action, DateTimeOffset timestampUtc)
    {
        TimeSpan elapsed = DateTimeOffset.UtcNow - timestampUtc;
        if (elapsed < TimeSpan.Zero)
        {
            elapsed = TimeSpan.Zero;
        }

        if (elapsed < TimeSpan.FromHours(1))
            return $"{action} {FormatRelativeTime(elapsed)}";

        return FormatAbsoluteTimestamp(action, timestampUtc);
    }

    private static string FormatAbsoluteTimestamp(string action, DateTimeOffset timestampUtc)
    {
        DateTime local = timestampUtc.ToLocalTime().DateTime;
        DateTime today = DateTime.Today;

        if (local.Date == today)
            return $"{action} today at {local:h:mm tt}";

        if (local.Date == today.AddDays(-1))
            return $"{action} yesterday at {local:h:mm tt}";

        return $"{action} {local:MMM d} at {local:h:mm tt}";
    }

    private static string FormatRelativeTime(TimeSpan elapsed)
    {
        if (elapsed < TimeSpan.FromMinutes(1))
            return "just now";

        if (elapsed < TimeSpan.FromHours(1))
        {
            int minutes = Math.Max(1, (int)Math.Round(elapsed.TotalMinutes));
            return minutes == 1 ? "1 min ago" : $"{minutes} mins ago";
        }

        if (elapsed < TimeSpan.FromDays(1))
        {
            int hours = Math.Max(1, (int)Math.Round(elapsed.TotalHours));
            return hours == 1 ? "1 hour ago" : $"{hours} hours ago";
        }

        int days = Math.Max(1, (int)Math.Round(elapsed.TotalDays));
        return days == 1 ? "1 day ago" : $"{days} days ago";
    }
}
