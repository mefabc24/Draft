using Draft.Helpers;
using System.IO;
using System.Security;
using System.Text.RegularExpressions;
using System.Windows.Input;

namespace Draft.ViewModels;

public enum WorkspaceState
{
    Editor,
    Split,
    Preview
}

public class MainWindowViewModel : BaseViewModel
{
    private WorkspaceState _workspaceState;
    private string _currentContent = string.Empty;
    private string? _currentFilePath;
    private string _lastSavedContent = string.Empty;
    private int _wordCount;
    private bool _isDirty;
    private bool _confirmBeforeClosingUnsavedFiles = true;
    private bool _isStatusBarVisible = true;
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
        }
    }

    public bool HasFilePath => !string.IsNullOrWhiteSpace(CurrentFilePath);

    public bool HasUnsavedWork => IsDirty
        || (!HasFilePath && !string.IsNullOrEmpty(CurrentContent));

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

    public event EventHandler? OpenFileRequested;

    public event EventHandler? SaveFileAsRequested;

    public event EventHandler? NewFileRequested;

    public event EventHandler? OpenSettingsRequested;

    public event EventHandler<FileOperationFailedEventArgs>? FileOperationFailed;

    public MainWindowViewModel()
    {
        OpenFileCommand = new RelayCommand(() => OpenFileRequested?.Invoke(this, EventArgs.Empty));
        SaveFileCommand = new RelayCommand(ExecuteSaveFileCommand);
        NewFileCommand = new RelayCommand(() => NewFileRequested?.Invoke(this, EventArgs.Empty));
        OpenSettingsCommand = new RelayCommand(() => OpenSettingsRequested?.Invoke(this, EventArgs.Empty));

        WorkspaceState = WorkspaceState.Split;
        WordCount = 0;
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
        ConfirmBeforeClosingUnsavedFiles = settings.ConfirmBeforeClosingUnsavedFiles;
        DefaultSaveLocation = settings.DefaultSaveLocation;
        IsStatusBarVisible = settings.IsStatusBarVisible;

        // TODO: Wire ReopenLastWorkspaceOnStartup once Draft tracks workspace file sets.
        // TODO: Wire AutosaveEnabled/AutosaveInterval and SaveOnFocusLost to a save scheduler.
        // TODO: Wire ToolbarControlbarPosition when alternate control bar layouts exist.
    }

    public void LoadDocumentFromPath(string path)
    {
        string content = File.ReadAllText(path);

        CurrentFilePath = Path.GetFullPath(path);
        CurrentContent = content;
        WordCount = CountWords(content);
        ResetDirtyState();
    }

    public void SaveDocumentToCurrentPath()
    {
        if (!HasFilePath || CurrentFilePath is null)
            throw new InvalidOperationException("Cannot save without a current file path.");

        SaveDocumentToPath(CurrentFilePath);
    }

    public void SaveDocumentToPath(string path)
    {
        File.WriteAllText(path, CurrentContent);

        CurrentFilePath = Path.GetFullPath(path);
        ResetDirtyState();
    }

    public void UpdateContentFromWeb(string content)
    {
        CurrentContent = content;
        WordCount = CountWords(content);
        UpdateDirtyState();
    }

    public void CreateNewDocument()
    {
        CurrentFilePath = null;
        CurrentContent = string.Empty;
        WordCount = 0;
        ResetDirtyState();
    }

    private void ExecuteSaveFileCommand()
    {
        if (!HasFilePath)
        {
            SaveFileAsRequested?.Invoke(this, EventArgs.Empty);
            return;
        }

        try
        {
            SaveDocumentToCurrentPath();
        }
        catch (Exception ex) when (IsFileOperationException(ex))
        {
            FileOperationFailed?.Invoke(
                this,
                new FileOperationFailedEventArgs("Unable to save the current file.", ex.Message));
        }
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

    private static int CountWords(string content)
    {
        return Regex.Matches(content, @"\S+").Count;
    }

    private static bool IsFileOperationException(Exception ex)
    {
        return ex is IOException
            or UnauthorizedAccessException
            or NotSupportedException
            or SecurityException
            or InvalidOperationException;
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
