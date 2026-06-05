using Draft.Dialogs.Message.Models;
using Draft.Dialogs.Prompts.Autosave.Models;
using Draft.Dialogs.Prompts.Export.Models;
using Draft.Dialogs.Prompts.GoToPosition.Models;
using Draft.Dialogs.Prompts.RevertSave.Models;
using Draft.Export.Models;
using Draft.Export.Services;
using Draft.Save.Models;
using Draft.Shell.Services;
using Draft.Shell.ViewModels;
using Draft.WebWorkspace.Services;
using Microsoft.Web.WebView2.Core;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Security;
using System.Text.Json;
using System.Windows;
using System.Windows.Input;
using System.Windows.Threading;

namespace Draft.Shell.Views;

public partial class MainWindow : Window
{
    public static readonly DependencyProperty IsWindowSnappedProperty =
        DependencyProperty.Register(
            nameof(IsWindowSnapped),
            typeof(bool),
            typeof(MainWindow),
            new PropertyMetadata(false));

    private const string WebHostName = "draft.local";
    private readonly MainWindowSessionService _sessionService = new();
    private readonly ShellDialogCoordinator _dialogCoordinator = new();
    private readonly ShellFileDialogService _fileDialogService = new();
    private readonly DocumentExportService _documentExportService = new();
    private readonly DraftWebViewHostService _webViewHostService = new();
    private readonly DraftWebViewMessageBridge _webViewMessageBridge = new();
    private readonly WindowSizingService _windowSizingService = new();
    private DraftSettings _settings;
    private bool _isWebViewReady;
    private bool _isSettingsWindowOpen;
    private bool _isPromptWindowOpen;
    private bool _hasHandledFocusLostSave;
    private MainWindowViewModel? ViewModel => DataContext as MainWindowViewModel;

    public bool IsWindowSnapped
    {
        get => (bool)GetValue(IsWindowSnappedProperty);
        private set
        {
            if (IsWindowSnapped == value)
                return;

            SetValue(IsWindowSnappedProperty, value);
            UpdateWindowCornerRadius();
        }
    }

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
        _settings = AppSettingsStore.Normalize(settings);
        _windowSizingService.ApplyStartupWindowSize(this);
        _windowSizingService.ApplyMinimumWindowSize(this, _settings);
        viewModel.ApplySettings(_settings);
        DataContext = viewModel;
        SubscribeToViewModel(viewModel);
        Loaded += MainWindow_Loaded;
        LocationChanged += MainWindow_PositionChanged;
        SizeChanged += MainWindow_SizeChanged;
        StateChanged += MainWindow_PositionChanged;
        UpdateWindowCornerRadius();
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        UpdateWindowSnapState();

        await _webViewHostService.InitializeAsync(
            WorkspaceWebView,
            WebHostName,
            CoreWebView2_WebMessageReceived,
            WorkspaceWebView_NavigationStarting,
            WorkspaceWebView_NewWindowRequested,
            WorkspaceWebView_NavigationCompleted);
    }

    protected override void OnActivated(EventArgs e)
    {
        _hasHandledFocusLostSave = false;
        base.OnActivated(e);
        PlaceShadowBehindMainWindow();
    }

    protected override async void OnDeactivated(EventArgs e)
    {
        base.OnDeactivated(e);

        if (_isSettingsWindowOpen
            || _isPromptWindowOpen
            || _hasHandledFocusLostSave
            || ViewModel is null)
        {
            return;
        }

        _hasHandledFocusLostSave = true;
        await ViewModel.TrySaveOnFocusLostAsync();
    }

    protected override void OnClosed(EventArgs e)
    {
        LocationChanged -= MainWindow_PositionChanged;
        SizeChanged -= MainWindow_SizeChanged;
        StateChanged -= MainWindow_PositionChanged;
        CloseShadowWindow();

        if (ViewModel is not null)
        {
            UnsubscribeFromViewModel(ViewModel);
        }

        if (WorkspaceWebView.CoreWebView2 is not null)
        {
            WorkspaceWebView.CoreWebView2.WebMessageReceived -= CoreWebView2_WebMessageReceived;
            WorkspaceWebView.CoreWebView2.NavigationStarting -= WorkspaceWebView_NavigationStarting;
            WorkspaceWebView.CoreWebView2.NewWindowRequested -= WorkspaceWebView_NewWindowRequested;
        }

        WorkspaceWebView.NavigationCompleted -= WorkspaceWebView_NavigationCompleted;

        base.OnClosed(e);
    }

    private void MainWindow_PositionChanged(object? sender, EventArgs e)
    {
        UpdateWindowSnapState();
        UpdateWindowCornerRadius();
        SyncShadowWindow();
    }

    private void MainWindow_SizeChanged(object sender, SizeChangedEventArgs e)
    {
        UpdateWindowSnapState();
        UpdateWindowCornerRadius();
        SyncShadowWindow();
    }

    private void UpdateWindowCornerRadius()
    {
        CornerRadius frameCornerRadius = _windowSizingService.GetFrameCornerRadius(WindowState, IsWindowSnapped);

        WindowFrameBorder.CornerRadius = frameCornerRadius;
        MainWindowChrome.CornerRadius = frameCornerRadius;
        StatusBarBorder.CornerRadius = _windowSizingService.GetStatusBarCornerRadius(WindowState, IsWindowSnapped);
        SyncShadowWindow();
    }

    protected override void OnClosing(CancelEventArgs e)
    {
        if (!_dialogCoordinator.ConfirmCloseWithUnsavedChanges(ViewModel))
        {
            e.Cancel = true;
            return;
        }

        if (ViewModel is not null)
        {
            AppSessionStateStore.TrySave(_sessionService.Capture(this, ViewModel));
        }

        base.OnClosing(e);
    }

    private void SubscribeToViewModel(MainWindowViewModel viewModel)
    {
        viewModel.PropertyChanged += ViewModel_PropertyChanged;
        viewModel.OpenFileRequested += ViewModel_OpenFileRequested;
        viewModel.SaveFileAsRequested += ViewModel_SaveFileAsRequested;
        viewModel.OpenExportPromptRequested += ViewModel_OpenExportPromptRequested;
        viewModel.NewFileRequested += ViewModel_NewFileRequested;
        viewModel.OpenSettingsRequested += ViewModel_OpenSettingsRequested;
        viewModel.OpenAboutSettingsRequested += ViewModel_OpenAboutSettingsRequested;
        viewModel.OpenCursorPositionPromptRequested += ViewModel_OpenCursorPositionPromptRequested;
        viewModel.OpenAutosavePromptRequested += ViewModel_OpenAutosavePromptRequested;
        viewModel.OpenRevertSavePromptRequested += ViewModel_OpenRevertSavePromptRequested;
        viewModel.FileOperationFailed += ViewModel_FileOperationFailed;
    }

    private void UnsubscribeFromViewModel(MainWindowViewModel viewModel)
    {
        viewModel.PropertyChanged -= ViewModel_PropertyChanged;
        viewModel.OpenFileRequested -= ViewModel_OpenFileRequested;
        viewModel.SaveFileAsRequested -= ViewModel_SaveFileAsRequested;
        viewModel.OpenExportPromptRequested -= ViewModel_OpenExportPromptRequested;
        viewModel.NewFileRequested -= ViewModel_NewFileRequested;
        viewModel.OpenSettingsRequested -= ViewModel_OpenSettingsRequested;
        viewModel.OpenAboutSettingsRequested -= ViewModel_OpenAboutSettingsRequested;
        viewModel.OpenCursorPositionPromptRequested -= ViewModel_OpenCursorPositionPromptRequested;
        viewModel.OpenAutosavePromptRequested -= ViewModel_OpenAutosavePromptRequested;
        viewModel.OpenRevertSavePromptRequested -= ViewModel_OpenRevertSavePromptRequested;
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
        if (ViewModel is null || !_dialogCoordinator.ConfirmDiscardUnsavedChanges(ViewModel))
            return;

        string? filePath = _fileDialogService.ShowOpenFileDialog(this);
        if (filePath is null)
            return;

        try
        {
            ViewModel.LoadDocumentFromPath(filePath);
            PostDocumentToWebView();
        }
        catch (Exception ex) when (IsFileOperationException(ex))
        {
            _dialogCoordinator.ShowFileOperationError("Open File", ex);
        }
    }

    private async void ViewModel_SaveFileAsRequested(object? sender, EventArgs e)
    {
        if (ViewModel is null)
            return;

        string? filePath = _fileDialogService.ShowSaveFileDialog(
            this,
            ViewModel.DisplayFileName,
            ViewModel.DefaultSaveLocation);
        if (filePath is null)
            return;

        await ViewModel.SaveDocumentToPathAsync(
            filePath,
            "Unable to save the current file.",
            DocumentSaveKind.Manual);
        PostDocumentToWebView();
    }

    private async void ViewModel_OpenExportPromptRequested(object? sender, EventArgs e)
    {
        if (ViewModel is not MainWindowViewModel viewModel)
            return;

        _isPromptWindowOpen = true;
        ExportPromptResult result;

        try
        {
            result = _dialogCoordinator.ShowExportPrompt(this);
        }
        finally
        {
            _isPromptWindowOpen = false;
        }

        if (!result.IsConfirmed)
            return;

        string? filePath = _fileDialogService.ShowExportSaveFileDialog(
            this,
            result.Format,
            viewModel.CurrentFilePath,
            viewModel.DefaultSaveLocation);
        if (filePath is null)
            return;

        if (result.Format == ExportFormat.Png)
        {
            _dialogCoordinator.ShowMessage(
                "Export",
                "PNG export is not implemented yet.",
                MessageDialogType.Info);
            return;
        }

        if (!_isWebViewReady || WorkspaceWebView.CoreWebView2 is null)
        {
            _dialogCoordinator.ShowMessage(
                "Export",
                "The Markdown preview is not ready yet. Try exporting again after the workspace finishes loading.",
                MessageDialogType.Warning);
            return;
        }

        try
        {
            string htmlDocument = await _webViewMessageBridge.GetPreviewExportHtmlAsync(
                WorkspaceWebView.CoreWebView2);

            await _documentExportService.ExportAsync(
                new DocumentExportRequest(
                    result.Format,
                    filePath,
                    htmlDocument),
                ExportWebView,
                WebHostName);
        }
        catch (Exception ex) when (IsExportException(ex))
        {
            _dialogCoordinator.ShowMessage(
                "Export",
                ex.Message,
                MessageDialogType.Error);
        }
    }

    private void ViewModel_NewFileRequested(object? sender, EventArgs e)
    {
        if (ViewModel is null || !_dialogCoordinator.ConfirmDiscardUnsavedChanges(ViewModel))
            return;

        ViewModel.CreateNewDocument();
        PostDocumentToWebView();
    }

    private void ViewModel_OpenSettingsRequested(object? sender, EventArgs e)
    {
        ShowSettings();
    }

    private void ViewModel_OpenAboutSettingsRequested(object? sender, EventArgs e)
    {
        ShowSettings(SettingsPage.About);
    }

    public void ShowSettings(SettingsPage initialPage = SettingsPage.General)
    {
        SettingsWindow settingsWindow = _dialogCoordinator.CreateSettingsWindow(
            this,
            initialPage,
            SettingsWindow_SettingsApplied);
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

    private void ViewModel_OpenCursorPositionPromptRequested(object? sender, EventArgs e)
    {
        if (ViewModel is not MainWindowViewModel viewModel)
            return;

        _isPromptWindowOpen = true;
        GoToPositionPromptResult result;

        try
        {
            result = _dialogCoordinator.ShowGoToPositionPrompt(
                this,
                viewModel.CursorLine,
                viewModel.CursorColumn);
        }
        finally
        {
            _isPromptWindowOpen = false;
        }

        if (result.IsConfirmed)
        {
            Dispatcher.BeginInvoke(
                new Action(() =>
                {
                    Activate();
                    WorkspaceWebView.Focus();
                    Keyboard.Focus(WorkspaceWebView);
                    PostGoToPosition(result.Line, result.Column);
                }),
                DispatcherPriority.ContextIdle);
        }
    }

    private void ViewModel_FileOperationFailed(object? sender, FileOperationFailedEventArgs e)
    {
        _dialogCoordinator.ShowMessage(
            e.Title,
            e.Message,
            MessageDialogType.Error);
    }

    private void ViewModel_OpenAutosavePromptRequested(object? sender, EventArgs e)
    {
        _isPromptWindowOpen = true;
        AutosavePromptResult result;

        try
        {
            result = _dialogCoordinator.ShowAutosavePrompt(this, _settings);
        }
        finally
        {
            _isPromptWindowOpen = false;
        }

        if (!result.IsConfirmed)
            return;

        DraftSettings updatedSettings = CopySettings(_settings);
        updatedSettings.AutosaveEnabled = result.AutosaveEnabled;
        updatedSettings.AutosaveInterval = result.AutosaveInterval;

        AppSettingsStore.TrySave(updatedSettings);
        ApplySettings(updatedSettings);
    }

    private void ViewModel_OpenRevertSavePromptRequested(object? sender, EventArgs e)
    {
        if (ViewModel is not MainWindowViewModel viewModel)
            return;

        if (!viewModel.HasFilePath)
        {
            _dialogCoordinator.ShowMessage(
                "Revert Save",
                "Open or save a file before restoring a saved version.",
                MessageDialogType.Warning);
            return;
        }

        _isPromptWindowOpen = true;
        RevertSavePromptResult result;

        try
        {
            result = _dialogCoordinator.ShowRevertSavePrompt(
                this,
                viewModel.CurrentFilePath);
        }
        finally
        {
            _isPromptWindowOpen = false;
        }

        if (!result.IsConfirmed)
            return;

        if (result.RestoredContent is null)
        {
            _dialogCoordinator.ShowMessage(
                "Revert Save",
                "The selected saved version could not be restored.",
                MessageDialogType.Error);
            return;
        }

        try
        {
            viewModel.RestoreContentFromSnapshot(result.RestoredContent);
            PostDocumentToWebView();
        }
        catch (Exception ex) when (IsFileOperationException(ex))
        {
            _dialogCoordinator.ShowMessage(
                "Revert Save",
                ex.Message,
                MessageDialogType.Error);
        }
    }

    private void SyncWebViewWithWorkspaceState()
    {
        if (ViewModel is null || !_isWebViewReady)
            return;

        PostWorkspaceMode(ViewModel.WorkspaceMode);
    }

    private void ApplySettings(DraftSettings settings)
    {
        _settings = AppSettingsStore.Normalize(settings);
        _windowSizingService.ApplyMinimumWindowSize(this, _settings);
        ViewModel?.ApplySettings(_settings);
        PostSettingsToWebView();
    }

    private static DraftSettings CopySettings(DraftSettings settings)
    {
        return new DraftSettings
        {
            ReopenLastWorkspaceOnStartup = settings.ReopenLastWorkspaceOnStartup,
            AutosaveEnabled = settings.AutosaveEnabled,
            AutosaveInterval = settings.AutosaveInterval,
            SaveOnFocusLost = settings.SaveOnFocusLost,
            IncludeMarkdownSyntaxInCharacterCount = settings.IncludeMarkdownSyntaxInCharacterCount,
            ConfirmBeforeClosingUnsavedFiles = settings.ConfirmBeforeClosingUnsavedFiles,
            DefaultStartupMode = settings.DefaultStartupMode,
            WindowMinimumSizeScale = settings.WindowMinimumSizeScale,
            DefaultSaveLocation = settings.DefaultSaveLocation,
            DefaultFileExtension = settings.DefaultFileExtension,
            AssociateTxtFilesWithDraft = settings.AssociateTxtFilesWithDraft,
            EditorFontFamily = settings.EditorFontFamily,
            EditorFontSize = settings.EditorFontSize,
            LineHeight = settings.LineHeight,
            WordWrap = settings.WordWrap,
            ShowLineNumbers = settings.ShowLineNumbers,
            HighlightCurrentLine = settings.HighlightCurrentLine,
            ShowWhitespaceCharacters = settings.ShowWhitespaceCharacters,
            ShowIndentationGuides = settings.ShowIndentationGuides,
            TabSize = settings.TabSize,
            InsertSpacesInsteadOfTabs = settings.InsertSpacesInsteadOfTabs,
            AutoPairBrackets = settings.AutoPairBrackets,
            AutoPairQuotes = settings.AutoPairQuotes,
            MarkdownSyntaxHighlighting = settings.MarkdownSyntaxHighlighting,
            CursorStyle = settings.CursorStyle,
            CursorBlinking = settings.CursorBlinking,
            MarkdownTheme = settings.MarkdownTheme,
            ConfirmBeforeOpeningExternalLinks = settings.ConfirmBeforeOpeningExternalLinks,
            PreviewScrollSyncMode = settings.PreviewScrollSyncMode,
            FloatingMarkdownToolbarMode = settings.FloatingMarkdownToolbarMode,
            ScrollPreviewToEditedSection = settings.ScrollPreviewToEditedSection,
            AppTheme = settings.AppTheme,
            IsStatusBarVisible = settings.IsStatusBarVisible,
            WindowBorderAccentMode = settings.WindowBorderAccentMode,
            ToolbarControlbarPosition = settings.ToolbarControlbarPosition,
        };
    }

    private void PostSettingsToWebView()
    {
        if (!_isWebViewReady)
            return;

        _webViewMessageBridge.PostSettings(WorkspaceWebView.CoreWebView2, _settings);

    }

    private void PostDocumentToWebView()
    {
        if (ViewModel is null || !_isWebViewReady)
            return;

        _webViewMessageBridge.PostDocument(
            WorkspaceWebView.CoreWebView2,
            ViewModel.CurrentContent,
            ViewModel.DisplayFileName);
    }

    private void PostGoToPosition(int line, int column)
    {
        if (!_isWebViewReady)
            return;

        _webViewMessageBridge.PostGoToPosition(
            WorkspaceWebView.CoreWebView2,
            line,
            column);
    }

    private void FocusWorkspaceWebView()
    {
        if (!_isWebViewReady || _isSettingsWindowOpen || _isPromptWindowOpen)
            return;

        WorkspaceWebView.Focus();
        Keyboard.Focus(WorkspaceWebView);
    }

    public void ApplySessionState(AppSessionState sessionState)
    {
        _sessionService.Apply(this, sessionState);
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

    private void WorkspaceWebView_NavigationStarting(object? sender, CoreWebView2NavigationStartingEventArgs e)
    {
        if (IsInternalWebViewUri(e.Uri))
            return;

        e.Cancel = true;
        OpenExternalUrl(e.Uri);
    }

    private void WorkspaceWebView_NewWindowRequested(object? sender, CoreWebView2NewWindowRequestedEventArgs e)
    {
        e.Handled = true;
        OpenExternalUrl(e.Uri);
    }

    private void PostWorkspaceMode(string mode)
    {
        _webViewMessageBridge.PostWorkspaceMode(WorkspaceWebView.CoreWebView2, mode);
    }

    private void CoreWebView2_WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        if (ViewModel is not MainWindowViewModel viewModel)
            return;

        _webViewMessageBridge.DispatchIncomingMessage(
            e.TryGetWebMessageAsString(),
            viewModel.SetWorkspaceMode,
            viewModel.UpdateContentFromWeb,
            viewModel.UpdateCursorPosition,
            () => viewModel.SaveFileCommand.Execute(null),
            OpenExternalUrl);
    }

    private void OpenExternalUrl(string url)
    {
        if (!TryCreateExternalUri(url, out Uri? uri))
            return;

        if (_settings.ConfirmBeforeOpeningExternalLinks
            && !_dialogCoordinator.ConfirmOpenExternalLink(uri))
        {
            return;
        }

        try
        {
            Process.Start(new ProcessStartInfo(uri.AbsoluteUri)
            {
                UseShellExecute = true,
            });
        }
        catch (Exception ex) when (IsExternalLinkException(ex))
        {
            _dialogCoordinator.ShowMessage(
                "Open External Link",
                "The link could not be opened in your default browser.",
                MessageDialogType.Error);
        }
    }

    private static bool TryCreateExternalUri(string url, out Uri uri)
    {
        uri = null!;

        if (string.IsNullOrWhiteSpace(url)
            || !Uri.TryCreate(url, UriKind.Absolute, out Uri? parsedUri))
        {
            return false;
        }

        if (!string.Equals(parsedUri.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
            && !string.Equals(parsedUri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
            && !string.Equals(parsedUri.Scheme, Uri.UriSchemeMailto, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        uri = parsedUri;
        return true;
    }

    private static bool IsInternalWebViewUri(string url)
    {
        return Uri.TryCreate(url, UriKind.Absolute, out Uri? uri)
            && string.Equals(uri.Host, WebHostName, StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsExternalLinkException(Exception ex)
    {
        return ex is Win32Exception
            or InvalidOperationException
            or FileNotFoundException
            or SecurityException;
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

    private static bool IsExportException(Exception ex)
    {
        return IsFileOperationException(ex)
            || ex is JsonException
            or NotSupportedException;
    }

}
