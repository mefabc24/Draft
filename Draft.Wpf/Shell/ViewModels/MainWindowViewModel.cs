using Draft.Documents.Models;
using Draft.Save.Models;
using Draft.Documents.Services;
using Draft.Save.Services;
using System.Globalization;
using System.IO;
using System.Reflection;
using System.Security;
using System.Windows;
using System.Windows.Input;
using System.Windows.Threading;
using Draft.Settings.Shortcuts;

namespace Draft.Shell.ViewModels;

public class MainWindowViewModel : BaseViewModel
{
    private const int MinimumSavingStatusMilliseconds = 1000;
    private const int CopyMarkdownFeedbackMilliseconds = 1000;
    private WorkspaceState _workspaceState;
    private readonly AutosaveScheduler _autosaveScheduler = new();
    private readonly DispatcherTimer _copyMarkdownFeedbackTimer = new()
    {
        Interval = TimeSpan.FromMilliseconds(CopyMarkdownFeedbackMilliseconds),
    };
    private readonly DocumentFileService _documentFileService;
    private readonly DocumentMetricsService _documentMetricsService;
    private readonly DocumentSessionState _documentState = new();
    private readonly SaveCoordinator _saveCoordinator;
    private int _wordCount;
    private int _characterCount;
    private int _cursorLine = 1;
    private int _cursorColumn = 1;
    private int _selectedCharacterCount;
    private bool _isSaving;
    private bool _isAutosaveTickRunning;
    private bool _autosaveEnabled;
    private string _autosaveInterval = "10s";
    private bool _saveOnFocusLost;
    private bool _includeMarkdownSyntaxInCharacterCount;
    private bool _confirmBeforeClosingUnsavedFiles = true;
    private bool _isStatusBarVisible = true;
    private bool _isStatusBarFileTypeVisible = true;
    private bool _isStatusBarEncodingVisible = true;
    private bool _isStatusBarWordCountVisible = true;
    private bool _isStatusBarCharacterCountVisible = true;
    private bool _isStatusBarCursorPositionVisible = true;
    private bool _isStatusBarRevertButtonVisible = true;
    private bool _isStatusBarSaveStatusVisible = true;
    private bool _isStatusBarAutosaveStatusVisible = true;
    private bool _isStatusBarAppVersionVisible = true;
    private bool _isCopyMarkdownFeedbackVisible;
    private string _windowBorderAccentMode = AppSettingsStore.WindowBorderAccentDisabled;
    private string _openShortcut = ShortcutSettingsCatalog.GetShortcut(null, ShortcutActionIds.AppOpen);
    private string _saveShortcut = ShortcutSettingsCatalog.GetShortcut(null, ShortcutActionIds.AppSave);
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

    public string CurrentContent => _documentState.CurrentContent;

    public string? CurrentFilePath => _documentState.CurrentFilePath;

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

    public string WordCountDisplay => WordCount == 1
        ? FormatLocalized(
            "status.wordCountSingular",
            "{count} WORD",
            ("count", WordCount.ToString(CultureInfo.CurrentCulture)))
        : FormatLocalized(
            "status.wordCountPlural",
            "{count} WORDS",
            ("count", WordCount.ToString(CultureInfo.CurrentCulture)));

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
        ? FormatLocalized(
            "status.characterCountSingular",
            "{count} CHAR",
            ("count", CharacterCount.ToString(CultureInfo.CurrentCulture)))
        : FormatLocalized(
            "status.characterCountPlural",
            "{count} CHARS",
            ("count", CharacterCount.ToString(CultureInfo.CurrentCulture)));

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
        ? FormatLocalized(
            "status.cursorPositionWithSelection",
            "LN {line}, COL {column} ({selected} SELECTED)",
            ("line", CursorLine.ToString(CultureInfo.CurrentCulture)),
            ("column", CursorColumn.ToString(CultureInfo.CurrentCulture)),
            ("selected", SelectedCharacterCount.ToString(CultureInfo.CurrentCulture)))
        : FormatLocalized(
            "status.cursorPosition",
            "LN {line}, COL {column}",
            ("line", CursorLine.ToString(CultureInfo.CurrentCulture)),
            ("column", CursorColumn.ToString(CultureInfo.CurrentCulture)));

    public bool IsDirty => _documentState.IsDirty;

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
                return Translate("status.saving", "SAVING...");

            if (!HasFilePath)
                return Translate("status.unsaved", "UNSAVED");

            return IsDirty
                ? Translate("status.modified", "MODIFIED")
                : Translate("status.saved", "SAVED");
        }
    }

    public bool SaveStatusDotVisible => _documentState.SaveStatusDotVisible;

    public string AutosaveModeDisplay => AutosaveEnabled
        ? Translate("status.autosave", "AUTOSAVE")
        : Translate("status.manualSave", "MANUAL SAVE");

    public string AppVersionDisplay { get; } = $"V{GetAppVersionDisplay().ToUpper()}";

    public bool HasFilePath => _documentState.HasFilePath;

    public bool HasUnsavedWork => _documentState.HasUnsavedWork;

    public bool CanOpenRevertSavePrompt => HasFilePath;

    public bool IsCopyMarkdownFeedbackVisible
    {
        get => _isCopyMarkdownFeedbackVisible;
        private set
        {
            if (_isCopyMarkdownFeedbackVisible == value)
                return;

            _isCopyMarkdownFeedbackVisible = value;
            OnPropertyChanged();
        }
    }

    public DateTimeOffset CurrentDraftUpdatedAtUtc => _documentState.CurrentDraftUpdatedAtUtc;

    public DateTimeOffset? LastSavedAtUtc => _documentState.LastSavedAtUtc;

    public DocumentSaveKind LastSaveKind => _documentState.LastSaveKind;

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

    public bool IsStatusBarFileTypeVisible
    {
        get => _isStatusBarFileTypeVisible;
        private set => SetProperty(ref _isStatusBarFileTypeVisible, value);
    }

    public bool IsStatusBarEncodingVisible
    {
        get => _isStatusBarEncodingVisible;
        private set => SetProperty(ref _isStatusBarEncodingVisible, value);
    }

    public bool IsStatusBarWordCountVisible
    {
        get => _isStatusBarWordCountVisible;
        private set => SetProperty(ref _isStatusBarWordCountVisible, value);
    }

    public bool IsStatusBarCharacterCountVisible
    {
        get => _isStatusBarCharacterCountVisible;
        private set => SetProperty(ref _isStatusBarCharacterCountVisible, value);
    }

    public bool IsStatusBarCursorPositionVisible
    {
        get => _isStatusBarCursorPositionVisible;
        private set => SetProperty(ref _isStatusBarCursorPositionVisible, value);
    }

    public bool IsStatusBarRevertButtonVisible
    {
        get => _isStatusBarRevertButtonVisible;
        private set => SetProperty(ref _isStatusBarRevertButtonVisible, value);
    }

    public bool IsStatusBarSaveStatusVisible
    {
        get => _isStatusBarSaveStatusVisible;
        private set => SetProperty(ref _isStatusBarSaveStatusVisible, value);
    }

    public bool IsStatusBarAutosaveStatusVisible
    {
        get => _isStatusBarAutosaveStatusVisible;
        private set => SetProperty(ref _isStatusBarAutosaveStatusVisible, value);
    }

    public bool IsStatusBarAppVersionVisible
    {
        get => _isStatusBarAppVersionVisible;
        private set => SetProperty(ref _isStatusBarAppVersionVisible, value);
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

    public ICommand SaveFileAsCommand { get; }

    public ICommand CopyMarkdownCommand { get; }

    public ICommand OpenExportPromptCommand { get; }

    public ICommand NewFileCommand { get; }

    public ICommand OpenSettingsCommand { get; }

    public ICommand OpenAboutSettingsCommand { get; }

    public ICommand OpenCursorPositionPromptCommand { get; }

    public ICommand OpenAutosavePromptCommand { get; }

    public ICommand OpenRevertSavePromptCommand { get; }

    public string OpenShortcut
    {
        get => _openShortcut;
        private set => SetProperty(ref _openShortcut, value);
    }

    public string SaveShortcut
    {
        get => _saveShortcut;
        private set => SetProperty(ref _saveShortcut, value);
    }

    public event EventHandler? OpenFileRequested;

    public event EventHandler? SaveFileAsRequested;

    public event EventHandler<MissingFilePathSaveRequestedEventArgs>? MissingFilePathSaveRequested;

    public event EventHandler? OpenExportPromptRequested;

    public event EventHandler? NewFileRequested;

    public event EventHandler? OpenSettingsRequested;

    public event EventHandler? OpenAboutSettingsRequested;

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
        _documentFileService = new DocumentFileService();
        _documentMetricsService = documentMetricsService;
        _saveCoordinator = new SaveCoordinator(
            _documentFileService,
            manualSaveSnapshotService,
            autosaveSnapshotService);
        _autosaveScheduler.Tick += AutosaveTimer_Tick;
        _copyMarkdownFeedbackTimer.Tick += CopyMarkdownFeedbackTimer_Tick;

        OpenFileCommand = new RelayCommand(() => OpenFileRequested?.Invoke(this, EventArgs.Empty));
        SaveFileCommand = new RelayCommand(ExecuteSaveFileCommand);
        SaveFileAsCommand = new RelayCommand(ExecuteSaveFileAsCommand);
        CopyMarkdownCommand = new RelayCommand(
            CopyMarkdownToClipboard,
            () => !string.IsNullOrEmpty(CurrentContent));
        OpenExportPromptCommand = new RelayCommand(() => OpenExportPromptRequested?.Invoke(this, EventArgs.Empty));
        NewFileCommand = new RelayCommand(() => NewFileRequested?.Invoke(this, EventArgs.Empty));
        OpenSettingsCommand = new RelayCommand(() => OpenSettingsRequested?.Invoke(this, EventArgs.Empty));
        OpenAboutSettingsCommand = new RelayCommand(
            () => OpenAboutSettingsRequested?.Invoke(this, EventArgs.Empty));
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

    private static string GetAppVersionDisplay()
    {
        Assembly assembly = typeof(MainWindowViewModel).Assembly;
        string? informationalVersion = assembly
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion;

        if (!string.IsNullOrWhiteSpace(informationalVersion))
        {
            int metadataSeparatorIndex = informationalVersion.IndexOf('+');
            return metadataSeparatorIndex > 0
                ? informationalVersion[..metadataSeparatorIndex]
                : informationalVersion;
        }

        Version? version = assembly.GetName().Version;
        return version is null
            ? "Unknown"
            : $"{version.Major}.{version.Minor}.{version.Build}";
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
        IsStatusBarFileTypeVisible = settings.IsStatusBarFileTypeVisible;
        IsStatusBarEncodingVisible = settings.IsStatusBarEncodingVisible;
        IsStatusBarWordCountVisible = settings.IsStatusBarWordCountVisible;
        IsStatusBarCharacterCountVisible = settings.IsStatusBarCharacterCountVisible;
        IsStatusBarCursorPositionVisible = settings.IsStatusBarCursorPositionVisible;
        IsStatusBarRevertButtonVisible = settings.IsStatusBarRevertButtonVisible;
        IsStatusBarSaveStatusVisible = settings.IsStatusBarSaveStatusVisible;
        IsStatusBarAutosaveStatusVisible = settings.IsStatusBarAutosaveStatusVisible;
        IsStatusBarAppVersionVisible = settings.IsStatusBarAppVersionVisible;
        WindowBorderAccentMode = settings.WindowBorderAccentMode;
        OpenShortcut = ShortcutSettingsCatalog.GetShortcut(settings.Shortcuts, ShortcutActionIds.AppOpen);
        SaveShortcut = ShortcutSettingsCatalog.GetShortcut(settings.Shortcuts, ShortcutActionIds.AppSave);
        RaiseLocalizedShellPropertiesChanged();

        // TODO: Wire ToolbarControlbarPosition when alternate control bar layouts exist.
    }

    public void LoadDocumentFromPath(string path)
    {
        DocumentState document = _documentFileService.LoadDocumentFromPath(path);

        _documentState.Load(document);
        RaiseDocumentStatePropertiesChanged();
        UpdateTextMetrics();
        UpdateCursorPosition(1, 1, 0);
    }

    public Task<bool> SaveDocumentToCurrentPathAsync(DocumentSaveKind saveKind = DocumentSaveKind.Manual)
    {
        if (!HasFilePath || CurrentFilePath is null)
            throw new InvalidOperationException("Cannot save without a current file path.");

        return SaveDocumentToPathAsync(
            CurrentFilePath,
            Translate("errors.saveCurrentFile", "Unable to save the current file."),
            saveKind);
    }

    public async Task<bool> SaveDocumentToPathAsync(
        string path,
        string? failureTitle = null,
        DocumentSaveKind saveKind = DocumentSaveKind.Manual)
    {
        if (IsSaving)
            return false;

        DateTime saveStartedAt = DateTime.UtcNow;
        string contentToSave = CurrentContent;
        bool didSave = false;

        IsSaving = true;

        try
        {
            DocumentSaveResult saveResult = await _saveCoordinator.SaveAsync(
                path,
                contentToSave,
                saveKind);

            _documentState.MarkSaved(
                saveResult.FullPath,
                contentToSave,
                saveResult.SavedAtUtc,
                saveKind);
            RaiseDocumentStatePropertiesChanged();
            didSave = true;
        }
        catch (Exception ex) when (IsFileOperationException(ex))
        {
            FileOperationFailed?.Invoke(
                this,
                new FileOperationFailedEventArgs(
                    failureTitle ?? Translate("errors.saveCurrentFile", "Unable to save the current file."),
                    ex.Message));
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

        return didSave;
    }

    public void UpdateContentFromWeb(string content)
    {
        _documentState.UpdateContent(content, DateTimeOffset.UtcNow);
        RaiseDocumentStatePropertiesChanged();
        UpdateTextMetrics();
    }

    public void RestoreContentFromSnapshot(string content)
    {
        _documentState.UpdateContent(content, DateTimeOffset.UtcNow);
        RaiseDocumentStatePropertiesChanged();
        UpdateTextMetrics();
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
        _documentState.CreateNew(DateTimeOffset.UtcNow);
        RaiseDocumentStatePropertiesChanged();
        UpdateTextMetrics();
        UpdateCursorPosition(1, 1, 0);
    }

    public async Task TrySaveOnFocusLostAsync()
    {
        if (!SaveOnFocusLost || !CanSaveExistingDirtyDocument())
            return;

        await SaveDocumentToPathAsync(
            CurrentFilePath!,
            Translate(
                "errors.saveOnFocusLost",
                "Unable to save the current file when Draft lost focus."),
            DocumentSaveKind.Automatic);
    }

    private async void ExecuteSaveFileCommand()
    {
        if (IsSaving)
            return;

        if (!HasFilePath)
        {
            SaveFileAsRequested?.Invoke(this, EventArgs.Empty);
            return;
        }

        if (CurrentFilePath is not null && !File.Exists(CurrentFilePath))
        {
            MissingFilePathSaveRequested?.Invoke(
                this,
                new MissingFilePathSaveRequestedEventArgs(CurrentFilePath));
            return;
        }

        await SaveDocumentToCurrentPathAsync(DocumentSaveKind.Manual);
    }

    private void ExecuteSaveFileAsCommand()
    {
        if (IsSaving)
            return;

        SaveFileAsRequested?.Invoke(this, EventArgs.Empty);
    }

    private void CopyMarkdownToClipboard()
    {
        if (string.IsNullOrEmpty(CurrentContent))
            return;

        Clipboard.SetText(CurrentContent);
        ShowCopyMarkdownFeedback();
    }

    private void ShowCopyMarkdownFeedback()
    {
        _copyMarkdownFeedbackTimer.Stop();
        IsCopyMarkdownFeedbackVisible = true;
        _copyMarkdownFeedbackTimer.Start();
    }

    private void CopyMarkdownFeedbackTimer_Tick(object? sender, EventArgs e)
    {
        _copyMarkdownFeedbackTimer.Stop();
        IsCopyMarkdownFeedbackVisible = false;
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
                    Translate("errors.autosaveCurrentFile", "Unable to autosave the current file."),
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
        _autosaveScheduler.Stop();

        if (!AutosaveEnabled || !CanSaveExistingDirtyDocument())
            return;

        _autosaveScheduler.Schedule(ParseAutosaveInterval(AutosaveInterval));
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

    private void RaiseDocumentStatePropertiesChanged()
    {
        OnPropertyChanged(nameof(CurrentContent));
        OnPropertyChanged(nameof(CurrentFilePath));
        OnPropertyChanged(nameof(DisplayFileName));
        OnPropertyChanged(nameof(HasFilePath));
        OnPropertyChanged(nameof(HasUnsavedWork));
        OnPropertyChanged(nameof(IsDirty));
        OnPropertyChanged(nameof(FileSaveStatusDisplay));
        OnPropertyChanged(nameof(SaveStatusDotVisible));
        OnPropertyChanged(nameof(CanOpenRevertSavePrompt));
        OnPropertyChanged(nameof(CurrentDraftUpdatedAtUtc));
        OnPropertyChanged(nameof(LastSavedAtUtc));
        OnPropertyChanged(nameof(LastSaveKind));
        CommandManager.InvalidateRequerySuggested();
        RefreshAutosaveTimer();
    }

    private void RaiseLocalizedShellPropertiesChanged()
    {
        OnPropertyChanged(nameof(WordCountDisplay));
        OnPropertyChanged(nameof(CharacterCountDisplay));
        OnPropertyChanged(nameof(CursorPositionDisplay));
        OnPropertyChanged(nameof(FileSaveStatusDisplay));
        OnPropertyChanged(nameof(AutosaveModeDisplay));
    }

    private static string Translate(string key, string fallback)
    {
        return LocalizationService.Translate(key, fallback);
    }

    private static string FormatLocalized(
        string key,
        string fallback,
        params (string Key, string Value)[] parameters)
    {
        Dictionary<string, string> parameterMap = parameters.ToDictionary(
            parameter => parameter.Key,
            parameter => parameter.Value,
            StringComparer.Ordinal);

        return LocalizationService.TranslateFormat(key, fallback, parameterMap);
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
}
