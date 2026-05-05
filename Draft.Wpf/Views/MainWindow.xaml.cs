using Draft.Dialogs.Models;
using Draft.Dialogs.Services;
using Draft.Helpers;
using Draft.ViewModels;
using Microsoft.Win32;
using Microsoft.Web.WebView2.Core;
using System.ComponentModel;
using System.IO;
using System.Security;
using System.Text.Json;
using System.Windows;

namespace Draft.Views;

public partial class MainWindow : Window
{
    private const string WebHostName = "draft.local";
    private const string WorkspaceModeMessageType = "workspaceModeChanged";
    private const string LoadDocumentMessageType = "loadDocument";
    private const string DocumentChangedMessageType = "documentChanged";
    private const string CursorPositionChangedMessageType = "cursorPositionChanged";
    private const string SettingsChangedMessageType = "settingsChanged";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly IDraftDialogService _draftDialogService = new DraftDialogService();
    private DraftSettings _settings;
    private bool _isWebViewReady;
    private bool _isSettingsWindowOpen;
    private bool _hasHandledFocusLostSave;
    private MainWindowViewModel? ViewModel => DataContext as MainWindowViewModel;

    public MainWindow()
        : this(new MainWindowViewModel(), AppSettingsStore.Load())
    {
    }

    public MainWindow(MainWindowViewModel viewModel)
        : this(viewModel, AppSettingsStore.Load())
    {
    }

    public MainWindow(MainWindowViewModel viewModel, DraftSettings settings)
    {
        InitializeComponent();
        _settings = settings;
        viewModel.ApplySettings(settings);
        DataContext = viewModel;
        SubscribeToViewModel(viewModel);
        Loaded += MainWindow_Loaded;
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        string webRootPath = GetWebRootPath();

        await WorkspaceWebView.EnsureCoreWebView2Async();

        WorkspaceWebView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
        WorkspaceWebView.CoreWebView2.Settings.IsZoomControlEnabled = false;
        WorkspaceWebView.ZoomFactor = 1.0;
        WorkspaceWebView.CoreWebView2.SetVirtualHostNameToFolderMapping(
            WebHostName,
            webRootPath,
            CoreWebView2HostResourceAccessKind.Allow);
        WorkspaceWebView.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;
        WorkspaceWebView.NavigationCompleted += WorkspaceWebView_NavigationCompleted;

        WorkspaceWebView.Source = new Uri($"https://{WebHostName}/index.html");
    }

    protected override void OnActivated(EventArgs e)
    {
        _hasHandledFocusLostSave = false;
        base.OnActivated(e);
    }

    protected override async void OnDeactivated(EventArgs e)
    {
        base.OnDeactivated(e);

        if (_isSettingsWindowOpen || _hasHandledFocusLostSave || ViewModel is null)
            return;

        _hasHandledFocusLostSave = true;
        await ViewModel.TrySaveOnFocusLostAsync();
    }

    protected override void OnClosed(EventArgs e)
    {
        if (ViewModel is not null)
        {
            UnsubscribeFromViewModel(ViewModel);
        }

        if (WorkspaceWebView.CoreWebView2 is not null)
        {
            WorkspaceWebView.CoreWebView2.WebMessageReceived -= CoreWebView2_WebMessageReceived;
        }

        WorkspaceWebView.NavigationCompleted -= WorkspaceWebView_NavigationCompleted;

        base.OnClosed(e);
    }

    protected override void OnClosing(CancelEventArgs e)
    {
        if (!ConfirmCloseWithUnsavedChanges())
        {
            e.Cancel = true;
            return;
        }

        if (ViewModel is not null)
        {
            AppSessionStateStore.TrySave(CaptureSessionState(ViewModel));
        }

        base.OnClosing(e);
    }

    private void SubscribeToViewModel(MainWindowViewModel viewModel)
    {
        viewModel.PropertyChanged += ViewModel_PropertyChanged;
        viewModel.OpenFileRequested += ViewModel_OpenFileRequested;
        viewModel.SaveFileAsRequested += ViewModel_SaveFileAsRequested;
        viewModel.NewFileRequested += ViewModel_NewFileRequested;
        viewModel.OpenSettingsRequested += ViewModel_OpenSettingsRequested;
        viewModel.FileOperationFailed += ViewModel_FileOperationFailed;
    }

    private void UnsubscribeFromViewModel(MainWindowViewModel viewModel)
    {
        viewModel.PropertyChanged -= ViewModel_PropertyChanged;
        viewModel.OpenFileRequested -= ViewModel_OpenFileRequested;
        viewModel.SaveFileAsRequested -= ViewModel_SaveFileAsRequested;
        viewModel.NewFileRequested -= ViewModel_NewFileRequested;
        viewModel.OpenSettingsRequested -= ViewModel_OpenSettingsRequested;
        viewModel.FileOperationFailed -= ViewModel_FileOperationFailed;
    }

    private void ViewModel_PropertyChanged(object? sender, PropertyChangedEventArgs e)
    {
        if (e.PropertyName == nameof(MainWindowViewModel.WorkspaceState))
        {
            SyncWebViewWithWorkspaceState();
        }
    }

    private void ViewModel_OpenFileRequested(object? sender, EventArgs e)
    {
        if (ViewModel is null || !ConfirmDiscardUnsavedChanges())
            return;

        OpenFileDialog dialog = new()
        {
            Filter = SupportedDocumentTypes.DialogFilter,
            CheckFileExists = true,
            Multiselect = false,
        };

        if (dialog.ShowDialog(this) != true)
            return;

        try
        {
            ViewModel.LoadDocumentFromPath(dialog.FileName);
            PostDocumentToWebView();
        }
        catch (Exception ex) when (IsFileOperationException(ex))
        {
            ShowFileOperationError("Open File", ex);
        }
    }

    private async void ViewModel_SaveFileAsRequested(object? sender, EventArgs e)
    {
        if (ViewModel is null)
            return;

        SaveFileDialog dialog = new()
        {
            Filter = SupportedDocumentTypes.DialogFilter,
            DefaultExt = SupportedDocumentTypes.DefaultExtension,
            AddExtension = true,
            OverwritePrompt = true,
            FileName = ViewModel.DisplayFileName,
        };

        string? initialDirectory = GetDefaultSaveDirectory();

        if (initialDirectory is not null)
        {
            dialog.InitialDirectory = initialDirectory;
        }

        if (dialog.ShowDialog(this) != true)
            return;

        await ViewModel.SaveDocumentToPathAsync(dialog.FileName, "Unable to save the current file.");
        PostDocumentToWebView();
    }

    private void ViewModel_NewFileRequested(object? sender, EventArgs e)
    {
        if (ViewModel is null || !ConfirmDiscardUnsavedChanges())
            return;

        ViewModel.CreateNewDocument();
        PostDocumentToWebView();
    }

    private void ViewModel_OpenSettingsRequested(object? sender, EventArgs e)
    {
        SettingsWindow settingsWindow = new()
        {
            Owner = this,
            WindowStartupLocation = WindowStartupLocation.CenterOwner,
        };

        settingsWindow.SettingsApplied += SettingsWindow_SettingsApplied;
        _isSettingsWindowOpen = true;

        try
        {
            settingsWindow.ShowDialog();
        }
        finally
        {
            _isSettingsWindowOpen = false;
            settingsWindow.SettingsApplied -= SettingsWindow_SettingsApplied;
        }
    }

    private void SettingsWindow_SettingsApplied(object? sender, SettingsAppliedEventArgs e)
    {
        ApplySettings(e.Settings);
    }

    private void ViewModel_FileOperationFailed(object? sender, FileOperationFailedEventArgs e)
    {
        ShowMessageDialog(
            e.Title,
            e.Message,
            DraftDialogType.Error);
    }

    private bool ConfirmDiscardUnsavedChanges()
    {
        if (ViewModel?.ConfirmBeforeClosingUnsavedFiles == false)
            return true;

        if (ViewModel?.IsDirty != true)
            return true;

        DraftDialogResult result = ShowConfirmationDialog(
            "Unsaved Changes",
            "You have unsaved changes. Do you want to continue?",
            "Continue",
            "continue");

        return result.Id == "continue";
    }

    private bool ConfirmCloseWithUnsavedChanges()
    {
        if (ViewModel?.ConfirmBeforeClosingUnsavedFiles == false)
            return true;

        if (ViewModel?.HasUnsavedWork != true)
            return true;

        DraftDialogResult result = ShowConfirmationDialog(
            "Unsaved Changes",
            "This file has unsaved changes or has not been saved yet. If you close now, all unsaved work will be lost. Do you really want to close Draft?",
            "Close Draft",
            "close-draft");

        return result.Id == "close-draft";
    }

    private void ShowFileOperationError(string title, Exception ex)
    {
        ShowMessageDialog(
            title,
            ex.Message,
            DraftDialogType.Error);
    }

    private void ShowMessageDialog(string title, string description, DraftDialogType dialogType)
    {
        _draftDialogService.ShowMessage(
            new DraftMessageDialogRequest(
                title,
                description,
                dialogType,
                new[]
                {
                    DraftDialogButtonDefinition.Primary("Okay", DraftDialogResult.Ok),
                }));
    }

    private DraftDialogResult ShowConfirmationDialog(
        string title,
        string description,
        string primaryButtonText,
        string primaryResultId)
    {
        return _draftDialogService.ShowMessage(
            new DraftMessageDialogRequest(
                title,
                description,
                DraftDialogType.Warning,
                new[]
                {
                    DraftDialogButtonDefinition.Secondary("Cancel", DraftDialogResult.Cancel),
                    DraftDialogButtonDefinition.Primary(primaryButtonText, new DraftDialogResult(primaryResultId)),
                }));
    }

    private void SyncWebViewWithWorkspaceState()
    {
        if (ViewModel is null || !_isWebViewReady)
            return;

        PostWorkspaceMode(ViewModel.WorkspaceMode);
    }

    private void ApplySettings(DraftSettings settings)
    {
        _settings = settings;
        ViewModel?.ApplySettings(settings);
        PostSettingsToWebView();
    }

    private void PostSettingsToWebView()
    {
        if (!_isWebViewReady)
            return;

        string message = JsonSerializer.Serialize(new SettingsChangedMessage(
            SettingsChangedMessageType,
            _settings.EditorFontFamily,
            _settings.EditorFontSize,
            _settings.LineHeight,
            _settings.WordWrap,
            _settings.ShowLineNumbers,
            _settings.HighlightCurrentLine,
            _settings.ShowWhitespaceCharacters,
            _settings.ShowIndentationGuides,
            _settings.TabSize,
            _settings.InsertSpacesInsteadOfTabs,
            _settings.AutoPairBrackets,
            _settings.AutoPairQuotes,
            _settings.MarkdownSyntaxHighlighting,
            _settings.CursorStyle,
            _settings.CursorBlinking,
            _settings.PreviewScrollSyncMode),
            JsonOptions);

        WorkspaceWebView.CoreWebView2?.PostWebMessageAsString(message);

        // TODO: Wire preview link/security settings once link interception is hosted.
    }

    private void PostDocumentToWebView()
    {
        if (ViewModel is null || !_isWebViewReady)
            return;

        string message = JsonSerializer.Serialize(new LoadDocumentMessage(
            LoadDocumentMessageType,
            ViewModel.CurrentContent,
            ViewModel.DisplayFileName),
            JsonOptions);

        WorkspaceWebView.CoreWebView2?.PostWebMessageAsString(message);
    }

    private static string GetWebRootPath()
    {
        string outputWebRootPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "Web"));
        string sourceWebRootPath = Path.GetFullPath(Path.Combine(
            AppContext.BaseDirectory,
            "..",
            "..",
            "..",
            "..",
            "Draft.Web",
            "dist"));

        return Directory.Exists(sourceWebRootPath) ? sourceWebRootPath : outputWebRootPath;
    }

    public void ApplySessionState(AppSessionState sessionState)
    {
        Rect bounds = new(
            sessionState.WindowLeft,
            sessionState.WindowTop,
            sessionState.WindowWidth,
            sessionState.WindowHeight);

        if (!IsValidWindowBounds(bounds))
            return;

        WindowStartupLocation = WindowStartupLocation.Manual;
        Left = bounds.Left;
        Top = bounds.Top;
        Width = bounds.Width;
        Height = bounds.Height;
    }

    private void WorkspaceWebView_NavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs e)
    {
        _isWebViewReady = e.IsSuccess;
        if (e.IsSuccess)
        {
            WorkspaceLoaderOverlay.Visibility = Visibility.Collapsed;
        }

        PostSettingsToWebView();
        SyncWebViewWithWorkspaceState();
        PostDocumentToWebView();
    }

    private void PostWorkspaceMode(string mode)
    {
        string message = JsonSerializer.Serialize(new WorkspaceModeMessage(
            WorkspaceModeMessageType,
            mode),
            JsonOptions);

        WorkspaceWebView.CoreWebView2?.PostWebMessageAsString(message);
    }

    private void CoreWebView2_WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        if (ViewModel is null)
            return;

        string message = e.TryGetWebMessageAsString();

        if (string.IsNullOrWhiteSpace(message))
            return;

        try
        {
            using JsonDocument document = JsonDocument.Parse(message);
            JsonElement root = document.RootElement;

            if (!root.TryGetProperty("type", out JsonElement typeElement))
                return;

            string? type = typeElement.GetString();

            switch (type)
            {
                case WorkspaceModeMessageType:
                    HandleWorkspaceModeMessage(root);
                    break;
                case DocumentChangedMessageType:
                    HandleDocumentChangedMessage(root);
                    break;
                case CursorPositionChangedMessageType:
                    HandleCursorPositionChangedMessage(root);
                    break;
            }
        }
        catch (JsonException)
        {
            return;
        }
    }

    private void HandleWorkspaceModeMessage(JsonElement root)
    {
        if (ViewModel is null || !root.TryGetProperty("mode", out JsonElement modeElement))
            return;

        string? mode = modeElement.GetString();

        if (!string.IsNullOrWhiteSpace(mode))
        {
            ViewModel.SetWorkspaceMode(mode);
        }
    }

    private void HandleDocumentChangedMessage(JsonElement root)
    {
        if (ViewModel is null || !root.TryGetProperty("content", out JsonElement contentElement))
            return;

        string? content = contentElement.GetString();
        ViewModel.UpdateContentFromWeb(content ?? string.Empty);
    }

    private void HandleCursorPositionChangedMessage(JsonElement root)
    {
        if (ViewModel is null
            || !root.TryGetProperty("line", out JsonElement lineElement)
            || !root.TryGetProperty("column", out JsonElement columnElement))
        {
            return;
        }

        int selectedCharacterCount = root.TryGetProperty(
            "selectedCharacterCount",
            out JsonElement selectedCharacterCountElement)
                && selectedCharacterCountElement.TryGetInt32(out int selectedCount)
            ? selectedCount
            : 0;

        if (lineElement.TryGetInt32(out int line)
            && columnElement.TryGetInt32(out int column))
        {
            ViewModel.UpdateCursorPosition(line, column, selectedCharacterCount);
        }
    }

    private AppSessionState CaptureSessionState(MainWindowViewModel viewModel)
    {
        Rect bounds = WindowState == WindowState.Normal
            ? new Rect(Left, Top, Width, Height)
            : RestoreBounds;
        string? lastDocumentPath = GetRestorableDocumentPath(viewModel.CurrentFilePath);

        return new AppSessionState(
            bounds.Width,
            bounds.Height,
            bounds.Left,
            bounds.Top,
            viewModel.WorkspaceMode,
            lastDocumentPath);
    }

    private static string? GetRestorableDocumentPath(string? filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath))
            return null;

        try
        {
            string fullPath = Path.GetFullPath(filePath);
            return SupportedDocumentTypes.IsSupportedExistingFile(fullPath)
                ? fullPath
                : null;
        }
        catch (Exception ex) when (IsFileOperationException(ex))
        {
            return null;
        }
    }

    private string? GetDefaultSaveDirectory()
    {
        if (!string.IsNullOrWhiteSpace(ViewModel?.DefaultSaveLocation)
            && Directory.Exists(ViewModel.DefaultSaveLocation))
        {
            return ViewModel.DefaultSaveLocation;
        }

        return null;
    }

    private static bool IsValidWindowBounds(Rect bounds)
    {
        if (bounds.Width < 480 || bounds.Height < 320)
            return false;

        Rect virtualScreen = new(
            SystemParameters.VirtualScreenLeft,
            SystemParameters.VirtualScreenTop,
            SystemParameters.VirtualScreenWidth,
            SystemParameters.VirtualScreenHeight);

        return bounds.IntersectsWith(virtualScreen);
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

    private sealed record WorkspaceModeMessage(string Type, string Mode);

    private sealed record LoadDocumentMessage(string Type, string Content, string FileName);

    private sealed record SettingsChangedMessage(
        string Type,
        string EditorFontFamily,
        int EditorFontSize,
        double LineHeight,
        bool WordWrap,
        bool ShowLineNumbers,
        bool HighlightCurrentLine,
        string ShowWhitespaceCharacters,
        bool ShowIndentationGuides,
        int TabSize,
        bool InsertSpacesInsteadOfTabs,
        bool AutoPairBrackets,
        bool AutoPairQuotes,
        bool MarkdownSyntaxHighlighting,
        string CursorStyle,
        bool CursorBlinking,
        string PreviewScrollSyncMode);
}
