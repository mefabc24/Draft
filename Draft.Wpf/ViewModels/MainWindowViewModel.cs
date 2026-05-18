using Draft.Helpers;
using Draft.Models.Save;
using Draft.Services.Save;
using System.IO;
using System.Security;
using System.Text.Json;
using System.Windows.Input;
using System.Windows.Threading;

namespace Draft.ViewModels;

public enum WorkspaceState
{
    Editor,
    Split,
    Preview
}

public class MainWindowViewModel : BaseViewModel
{
    private const int MinimumSavingStatusMilliseconds = 1000;
    private WorkspaceState _workspaceState;
    private readonly DispatcherTimer _autosaveTimer = new();
    private readonly DocumentMetricsService _documentMetricsService;
    private readonly ManualSaveSnapshotService _manualSaveSnapshotService;
    private readonly AutosaveSnapshotService _autosaveSnapshotService;
    private string _currentContent = string.Empty;
    private string? _currentFilePath;
    private string _lastSavedContent = string.Empty;
    private DateTimeOffset _currentDraftUpdatedAtUtc = DateTimeOffset.UtcNow;
    private DateTimeOffset? _lastSavedAtUtc;
    private DocumentSaveKind _lastSaveKind = DocumentSaveKind.Manual;
    private int _wordCount;
    private int _characterCount;
    private int _cursorLine = 1;
    private int _cursorColumn = 1;
    private int _selectedCharacterCount;
    private bool _isDirty;
    private bool _isSaving;
    private bool _isAutosaveTickRunning;
    private bool _autosaveEnabled;
    private string _autosaveInterval = "10s";
    private bool _saveOnFocusLost;
    private bool _includeMarkdownSyntaxInCharacterCount;
    private bool _confirmBeforeClosingUnsavedFiles = true;
    private bool _isStatusBarVisible = true;
    private string _windowBorderAccentMode = AppSettingsStore.WindowBorderAccentDisabled;
    private string _defaultSaveLocation = string.Empty;

    public WorkspaceState WorkspaceState
    {
        get => _workspaceState;
        set
        {
            if (_workspaceState == value)
                return;

            _workspaceState = value;
            OnPropertyChanged();
            OnPropertyChanged(nameof(WorkspaceMode));
            OnPropertyChanged(nameof(IsEditorState));
            OnPropertyChanged(nameof(IsSplitState));
            OnPropertyChanged(nameof(IsPreviewState));
        }
    }

    public string CurrentContent
    {
        get => _currentContent;
        private set
        {
            if (_currentContent == value)
                return;

            _currentContent = value;
            OnPropertyChanged();
            OnPropertyChanged(nameof(HasUnsavedWork));
            OnPropertyChanged(nameof(SaveStatusDotVisible));
        }
    }

    public string? CurrentFilePath
    {
        get => _currentFilePath;
        private set
        {
            if (_currentFilePath == value)
                return;

            _currentFilePath = value;
            OnPropertyChanged();
            OnPropertyChanged(nameof(DisplayFileName));
            OnPropertyChanged(nameof(HasFilePath));
            OnPropertyChanged(nameof(HasUnsavedWork));
            OnPropertyChanged(nameof(FileSaveStatusDisplay));
            OnPropertyChanged(nameof(SaveStatusDotVisible));
            OnPropertyChanged(nameof(CanOpenRevertSavePrompt));
            CommandManager.InvalidateRequerySuggested();
            RefreshAutosaveTimer();
        }
    }

    public string DisplayFileName
    {
        get
        {
            if (!HasFilePath)
                return SupportedDocumentTypes.DefaultFileName;

            return Path.GetFileName(CurrentFilePath) ?? SupportedDocumentTypes.DefaultFileName;
        }
    }

    public int WordCount
    {
        get => _wordCount;
        private set
        {
            if (_wordCount == value)
                return;

            _wordCount = value;
            OnPropertyChanged();
            OnPropertyChanged(nameof(WordCountDisplay));
        }
    }

    public string WordCountDisplay => WordCount == 1 ? "1 WORD" : $"{WordCount} WORDS";

    public int CharacterCount
    {
        get => _characterCount;
        private set
        {
            if (_characterCount == value)
                return;

            _characterCount = value;
            OnPropertyChanged();
            OnPropertyChanged(nameof(CharacterCountDisplay));
        }
    }

    public string CharacterCountDisplay => CharacterCount == 1
        ? "1 CHAR"
        : $"{CharacterCount} CHARS";

    public int CursorLine
    {
        get => _cursorLine;
        private set
        {
            int nextValue = Math.Max(value, 1);

            if (_cursorLine == nextValue)
                return;

            _cursorLine = nextValue;
            OnPropertyChanged();
            OnPropertyChanged(nameof(CursorPositionDisplay));
        }
    }

    public int CursorColumn
    {
        get => _cursorColumn;
        private set
        {
            int nextValue = Math.Max(value, 1);

            if (_cursorColumn == nextValue)
                return;

            _cursorColumn = nextValue;
            OnPropertyChanged();
            OnPropertyChanged(nameof(CursorPositionDisplay));
        }
    }

    public int SelectedCharacterCount
    {
        get => _selectedCharacterCount;
        private set
        {
            int nextValue = Math.Max(value, 0);

            if (_selectedCharacterCount == nextValue)
                return;

            _selectedCharacterCount = nextValue;
            OnPropertyChanged();
            OnPropertyChanged(nameof(CursorPositionDisplay));
        }
    }

    public string CursorPositionDisplay => SelectedCharacterCount > 0
        ? $"LN {CursorLine}, COL {CursorColumn} ({SelectedCharacterCount} SELECTED)"
        : $"LN {CursorLine}, COL {CursorColumn}";

    public bool IsDirty
    {
        get => _isDirty;
        private set
        {
            if (_isDirty == value)
                return;

            _isDirty = value;
            OnPropertyChanged();
            OnPropertyChanged(nameof(HasUnsavedWork));
            OnPropertyChanged(nameof(FileSaveStatusDisplay));
            OnPropertyChanged(nameof(SaveStatusDotVisible));
            RefreshAutosaveTimer();
        }
    }

    public bool IsSaving
    {
        get => _isSaving;
        private set
        {
            if (_isSaving == value)
                return;

            _isSaving = value;
            OnPropertyChanged();
            OnPropertyChanged(nameof(FileSaveStatusDisplay));
            RefreshAutosaveTimer();
        }
    }

    public bool AutosaveEnabled
    {
        get => _autosaveEnabled;
        private set
        {
            if (_autosaveEnabled == value)
                return;

            _autosaveEnabled = value;
            OnPropertyChanged();
            OnPropertyChanged(nameof(AutosaveModeDisplay));
            RefreshAutosaveTimer();
        }
    }

    public string AutosaveInterval
    {
        get => _autosaveInterval;
        private set
        {
            if (_autosaveInterval == value)
                return;

            _autosaveInterval = value;
            OnPropertyChanged();
            RefreshAutosaveTimer();
        }
    }

    public bool SaveOnFocusLost
    {
        get => _saveOnFocusLost;
        private set
        {
            if (_saveOnFocusLost == value)
                return;

            _saveOnFocusLost = value;
            OnPropertyChanged();
        }
    }

    public bool IncludeMarkdownSyntaxInCharacterCount
    {
        get => _includeMarkdownSyntaxInCharacterCount;
        private set
        {
            if (_includeMarkdownSyntaxInCharacterCount == value)
                return;

            _includeMarkdownSyntaxInCharacterCount = value;
            OnPropertyChanged();
            UpdateTextMetrics();
        }
    }

    public string FileSaveStatusDisplay
    {
        get
        {
            if (IsSaving)
                return "SAVING...";

            if (!HasFilePath)
                return "UNSAVED";

            return IsDirty ? "MODIFIED" : "SAVED";
        }
    }

    public bool SaveStatusDotVisible => HasFilePath
        || IsDirty
        || !string.IsNullOrEmpty(CurrentContent);

    public string AutosaveModeDisplay => AutosaveEnabled ? "AUTOSAVE" : "MANUAL SAVE";

    public bool HasFilePath => !string.IsNullOrWhiteSpace(CurrentFilePath);

    public bool HasUnsavedWork => IsDirty
        || (!HasFilePath && !string.IsNullOrEmpty(CurrentContent));

    public bool CanOpenRevertSavePrompt => HasFilePath;

    public DateTimeOffset CurrentDraftUpdatedAtUtc => _currentDraftUpdatedAtUtc;

    public DateTimeOffset? LastSavedAtUtc => _lastSavedAtUtc;

    public DocumentSaveKind LastSaveKind => _lastSaveKind;

    public bool ConfirmBeforeClosingUnsavedFiles
    {
        get => _confirmBeforeClosingUnsavedFiles;
        private set
        {
            if (_confirmBeforeClosingUnsavedFiles == value)
                return;

            _confirmBeforeClosingUnsavedFiles = value;
            OnPropertyChanged();
        }
    }

    public bool IsStatusBarVisible
    {
        get => _isStatusBarVisible;
        private set
        {
            if (_isStatusBarVisible == value)
                return;

            _isStatusBarVisible = value;
            OnPropertyChanged();
        }
    }

    public string WindowBorderAccentMode
    {
        get => _windowBorderAccentMode;
        private set
        {
            if (_windowBorderAccentMode == value)
                return;

            _windowBorderAccentMode = value;
            OnPropertyChanged();
        }
    }

    public string DefaultSaveLocation
    {
        get => _defaultSaveLocation;
        private set
        {
            if (_defaultSaveLocation == value)
                return;

            _defaultSaveLocation = value;
            OnPropertyChanged();
        }
    }

    public string WorkspaceMode => WorkspaceState switch
    {
        WorkspaceState.Editor => "editor",
        WorkspaceState.Split => "split",
        WorkspaceState.Preview => "preview",
        _ => "split",
    };

    public bool IsEditorState
    {
        get => WorkspaceState == WorkspaceState.Editor;
        set
        {
            if (value)
                WorkspaceState = WorkspaceState.Editor;
        }
    }

    public bool IsSplitState
    {
        get => WorkspaceState == WorkspaceState.Split;
        set
        {
            if (value)
                WorkspaceState = WorkspaceState.Split;
        }
    }

    public bool IsPreviewState
    {
        get => WorkspaceState == WorkspaceState.Preview;
        set
        {
            if (value)
                WorkspaceState = WorkspaceState.Preview;
        }
    }

    public ICommand OpenFileCommand { get; }

    public ICommand SaveFileCommand { get; }

    public ICommand NewFileCommand { get; }

    public ICommand OpenSettingsCommand { get; }

    public ICommand OpenCursorPositionPromptCommand { get; }

    public ICommand OpenAutosavePromptCommand { get; }

    public ICommand OpenRevertSavePromptCommand { get; }

    public event EventHandler? OpenFileRequested;

    public event EventHandler? SaveFileAsRequested;

    public event EventHandler? NewFileRequested;

    public event EventHandler? OpenSettingsRequested;

    public event EventHandler? OpenCursorPositionPromptRequested;

    public event EventHandler? OpenAutosavePromptRequested;

    public event EventHandler? OpenRevertSavePromptRequested;

    public event EventHandler<FileOperationFailedEventArgs>? FileOperationFailed;

    public MainWindowViewModel()
        : this(new DocumentMetricsService(), new ManualSaveSnapshotService(), new AutosaveSnapshotService())
    {
    }

    public MainWindowViewModel(
        DocumentMetricsService documentMetricsService,
        ManualSaveSnapshotService manualSaveSnapshotService,
        AutosaveSnapshotService autosaveSnapshotService)
    {
        _documentMetricsService = documentMetricsService;
        _manualSaveSnapshotService = manualSaveSnapshotService;
        _autosaveSnapshotService = autosaveSnapshotService;
        _autosaveTimer.Tick += AutosaveTimer_Tick;

        OpenFileCommand = new RelayCommand(() => OpenFileRequested?.Invoke(this, EventArgs.Empty));
        SaveFileCommand = new RelayCommand(ExecuteSaveFileCommand);
        NewFileCommand = new RelayCommand(() => NewFileRequested?.Invoke(this, EventArgs.Empty));
        OpenSettingsCommand = new RelayCommand(() => OpenSettingsRequested?.Invoke(this, EventArgs.Empty));
        OpenCursorPositionPromptCommand = new RelayCommand(
            () => OpenCursorPositionPromptRequested?.Invoke(this, EventArgs.Empty));
        OpenAutosavePromptCommand = new RelayCommand(
            () => OpenAutosavePromptRequested?.Invoke(this, EventArgs.Empty));
        OpenRevertSavePromptCommand = new RelayCommand(
            () => OpenRevertSavePromptRequested?.Invoke(this, EventArgs.Empty),
            () => CanOpenRevertSavePrompt);

        WorkspaceState = WorkspaceState.Split;
        UpdateTextMetrics();
    }

    public void SetWorkspaceMode(string mode)
    {
        WorkspaceState = mode switch
        {
            "editor" => WorkspaceState.Editor,
            "split" => WorkspaceState.Split,
            "preview" => WorkspaceState.Preview,
            _ => WorkspaceState,
        };
    }

    public void ApplySettings(DraftSettings settings)
    {
        AutosaveEnabled = settings.AutosaveEnabled;
        AutosaveInterval = settings.AutosaveInterval;
        SaveOnFocusLost = settings.SaveOnFocusLost;
        IncludeMarkdownSyntaxInCharacterCount = settings.IncludeMarkdownSyntaxInCharacterCount;
        ConfirmBeforeClosingUnsavedFiles = settings.ConfirmBeforeClosingUnsavedFiles;
        DefaultSaveLocation = settings.DefaultSaveLocation;
        IsStatusBarVisible = settings.IsStatusBarVisible;
        WindowBorderAccentMode = settings.WindowBorderAccentMode;

        // TODO: Wire ToolbarControlbarPosition when alternate control bar layouts exist.
    }

    public void LoadDocumentFromPath(string path)
    {
        string content = File.ReadAllText(path);

        CurrentFilePath = Path.GetFullPath(path);
        CurrentContent = content;
        DateTimeOffset loadedAtUtc = GetFileTimestampUtc(CurrentFilePath);
        SetLastSavedAt(loadedAtUtc);
        SetCurrentDraftUpdatedAt(loadedAtUtc);
        SetLastSaveKind(DocumentSaveKind.Manual);
        UpdateTextMetrics();
        ResetDirtyState();
        UpdateCursorPosition(1, 1, 0);
    }

    public Task SaveDocumentToCurrentPathAsync(DocumentSaveKind saveKind = DocumentSaveKind.Manual)
    {
        if (!HasFilePath || CurrentFilePath is null)
            throw new InvalidOperationException("Cannot save without a current file path.");

        return SaveDocumentToPathAsync(CurrentFilePath, "Unable to save the current file.", saveKind);
    }

    public async Task SaveDocumentToPathAsync(
        string path,
        string failureTitle = "Unable to save the current file.",
        DocumentSaveKind saveKind = DocumentSaveKind.Manual)
    {
        if (IsSaving)
            return;

        DateTime saveStartedAt = DateTime.UtcNow;
        string contentToSave = CurrentContent;
        ManualSaveSnapshotMetadata? snapshotMetadata = null;
        AutosaveSnapshotMetadata? autosaveMetadata = null;

        IsSaving = true;

        try
        {
            await File.WriteAllTextAsync(path, contentToSave);

            string fullPath = Path.GetFullPath(path);

            if (saveKind == DocumentSaveKind.Manual)
            {
                try
                {
                    snapshotMetadata = await _manualSaveSnapshotService.SaveManualSnapshotAsync(
                        fullPath,
                        contentToSave);
                }
                catch (Exception ex) when (IsSnapshotOperationException(ex))
                {
                    snapshotMetadata = null;
                }
            }
            else
            {
                try
                {
                    autosaveMetadata = await _autosaveSnapshotService.SaveAutosaveSnapshotAsync(
                        fullPath,
                        contentToSave);
                }
                catch (Exception ex) when (IsSnapshotOperationException(ex))
                {
                    autosaveMetadata = null;
                }
            }

            DateTimeOffset savedAtUtc = snapshotMetadata?.UpdatedAtUtc
                ?? autosaveMetadata?.UpdatedAtUtc
                ?? DateTimeOffset.UtcNow;
            CurrentFilePath = fullPath;
            _lastSavedContent = contentToSave;
            SetLastSavedAt(savedAtUtc);
            SetCurrentDraftUpdatedAt(savedAtUtc);
            SetLastSaveKind(saveKind);
            UpdateDirtyState();
        }
        catch (Exception ex) when (IsFileOperationException(ex))
        {
            FileOperationFailed?.Invoke(
                this,
                new FileOperationFailedEventArgs(failureTitle, ex.Message));
        }
        finally
        {
            TimeSpan remainingStatusTime = TimeSpan.FromMilliseconds(MinimumSavingStatusMilliseconds)
                - (DateTime.UtcNow - saveStartedAt);

            if (remainingStatusTime > TimeSpan.Zero)
            {
                await Task.Delay(remainingStatusTime);
            }

            IsSaving = false;
        }
    }

    public void UpdateContentFromWeb(string content)
    {
        CurrentContent = content;
        SetCurrentDraftUpdatedAt(DateTimeOffset.UtcNow);
        UpdateTextMetrics();
        UpdateDirtyState();
    }

    public void RestoreContentFromSnapshot(string content)
    {
        CurrentContent = content;
        SetCurrentDraftUpdatedAt(DateTimeOffset.UtcNow);
        UpdateTextMetrics();
        UpdateDirtyState();
        UpdateCursorPosition(1, 1, 0);
    }

    public void UpdateCursorPosition(int line, int column, int selectedCharacterCount)
    {
        CursorLine = line;
        CursorColumn = column;
        SelectedCharacterCount = selectedCharacterCount;
    }

    public void CreateNewDocument()
    {
        CurrentFilePath = null;
        CurrentContent = string.Empty;
        SetLastSavedAt(null);
        SetCurrentDraftUpdatedAt(DateTimeOffset.UtcNow);
        SetLastSaveKind(DocumentSaveKind.Manual);
        UpdateTextMetrics();
        UpdateCursorPosition(1, 1, 0);
        ResetDirtyState();
    }

    public async Task TrySaveOnFocusLostAsync()
    {
        if (!SaveOnFocusLost || !CanSaveExistingDirtyDocument())
            return;

        await SaveDocumentToPathAsync(
            CurrentFilePath!,
            "Unable to save the current file when Draft lost focus.",
            DocumentSaveKind.Automatic);
    }

    private async void ExecuteSaveFileCommand()
    {
        if (!HasFilePath)
        {
            SaveFileAsRequested?.Invoke(this, EventArgs.Empty);
            return;
        }

        await SaveDocumentToCurrentPathAsync(DocumentSaveKind.Manual);
    }

    private void ResetDirtyState()
    {
        _lastSavedContent = CurrentContent;
        UpdateDirtyState();
    }

    private void UpdateDirtyState()
    {
        IsDirty = CurrentContent != _lastSavedContent;
    }

    private async void AutosaveTimer_Tick(object? sender, EventArgs e)
    {
        if (_isAutosaveTickRunning)
            return;

        _isAutosaveTickRunning = true;

        try
        {
            if (CanSaveExistingDirtyDocument())
            {
                await SaveDocumentToPathAsync(
                    CurrentFilePath!,
                    "Unable to autosave the current file.",
                    DocumentSaveKind.Automatic);
            }
        }
        finally
        {
            _isAutosaveTickRunning = false;
            RefreshAutosaveTimer();
        }
    }

    private bool CanSaveExistingDirtyDocument()
    {
        return HasFilePath
            && CurrentFilePath is not null
            && File.Exists(CurrentFilePath)
            && IsDirty
            && !IsSaving;
    }

    private void RefreshAutosaveTimer()
    {
        _autosaveTimer.Stop();

        if (!AutosaveEnabled || !CanSaveExistingDirtyDocument())
            return;

        _autosaveTimer.Interval = ParseAutosaveInterval(AutosaveInterval);
        _autosaveTimer.Start();
    }

    private static TimeSpan ParseAutosaveInterval(string interval)
    {
        return interval switch
        {
            "5s" => TimeSpan.FromSeconds(5),
            "30s" => TimeSpan.FromSeconds(30),
            "1m" => TimeSpan.FromMinutes(1),
            "5m" => TimeSpan.FromMinutes(5),
            _ => TimeSpan.FromSeconds(10),
        };
    }

    private void UpdateTextMetrics()
    {
        DocumentMetrics metrics = _documentMetricsService.Calculate(
            CurrentContent,
            IncludeMarkdownSyntaxInCharacterCount);

        WordCount = metrics.WordCount;
        CharacterCount = metrics.CharacterCount;
    }

    private void SetCurrentDraftUpdatedAt(DateTimeOffset value)
    {
        if (_currentDraftUpdatedAtUtc == value)
            return;

        _currentDraftUpdatedAtUtc = value;
        OnPropertyChanged(nameof(CurrentDraftUpdatedAtUtc));
    }

    private void SetLastSavedAt(DateTimeOffset? value)
    {
        if (_lastSavedAtUtc == value)
            return;

        _lastSavedAtUtc = value;
        OnPropertyChanged(nameof(LastSavedAtUtc));
    }

    private void SetLastSaveKind(DocumentSaveKind value)
    {
        if (_lastSaveKind == value)
            return;

        _lastSaveKind = value;
        OnPropertyChanged(nameof(LastSaveKind));
    }

    private static DateTimeOffset GetFileTimestampUtc(string path)
    {
        try
        {
            return new DateTimeOffset(File.GetLastWriteTimeUtc(path), TimeSpan.Zero);
        }
        catch (Exception ex) when (IsFileOperationException(ex))
        {
            return DateTimeOffset.UtcNow;
        }
    }

    private static bool IsFileOperationException(Exception ex)
    {
        return ex is IOException
            or UnauthorizedAccessException
            or ArgumentException
            or NotSupportedException
            or PathTooLongException
            or SecurityException
            or InvalidOperationException;
    }

    private static bool IsSnapshotOperationException(Exception ex)
    {
        return IsFileOperationException(ex)
            || ex is JsonException
            || ex is System.Security.Cryptography.CryptographicException;
    }
}

public sealed class FileOperationFailedEventArgs : EventArgs
{
    public FileOperationFailedEventArgs(string title, string message)
    {
        Title = title;
        Message = message;
    }

    public string Title { get; }

    public string Message { get; }
}
