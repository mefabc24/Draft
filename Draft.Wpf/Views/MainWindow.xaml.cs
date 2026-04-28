using Draft.Helpers;
using Draft.ViewModels;
using Microsoft.Win32;
using Microsoft.Web.WebView2.Core;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;
using System.Security;
using System.Text.Json;
using System.Windows;
using System.Windows.Interop;

namespace Draft.Views;

public partial class MainWindow : Window
{
    private const int WmGetMinMaxInfo = 0x0024;
    private const uint MonitorDefaultToNearest = 0x00000002;
    private const string WebHostName = "draft.local";
    private const string WorkspaceModeMessageType = "workspaceModeChanged";
    private const string LoadDocumentMessageType = "loadDocument";
    private const string DocumentChangedMessageType = "documentChanged";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private bool _isWebViewReady;
    private MainWindowViewModel? ViewModel => DataContext as MainWindowViewModel;

    public MainWindow()
        : this(new MainWindowViewModel())
    {
    }

    public MainWindow(MainWindowViewModel viewModel)
    {
        InitializeComponent();
        DataContext = viewModel;
        SubscribeToViewModel(viewModel);
        Loaded += MainWindow_Loaded;
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        string webRootPath = GetWebRootPath();

        await WorkspaceWebView.EnsureCoreWebView2Async();

        WorkspaceWebView.CoreWebView2.SetVirtualHostNameToFolderMapping(
            WebHostName,
            webRootPath,
            CoreWebView2HostResourceAccessKind.Allow);
        WorkspaceWebView.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;
        WorkspaceWebView.NavigationCompleted += WorkspaceWebView_NavigationCompleted;

        WorkspaceWebView.Source = new Uri($"https://{WebHostName}/index.html");
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

    private void ViewModel_SaveFileAsRequested(object? sender, EventArgs e)
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

        if (dialog.ShowDialog(this) != true)
            return;

        try
        {
            ViewModel.SaveDocumentToPath(dialog.FileName);
            PostDocumentToWebView();
        }
        catch (Exception ex) when (IsFileOperationException(ex))
        {
            ShowFileOperationError("Save File", ex);
        }
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

        settingsWindow.ShowDialog();
    }

    private void ViewModel_FileOperationFailed(object? sender, FileOperationFailedEventArgs e)
    {
        MessageBox.Show(
            this,
            e.Message,
            e.Title,
            MessageBoxButton.OK,
            MessageBoxImage.Error);
    }

    private bool ConfirmDiscardUnsavedChanges()
    {
        if (ViewModel?.IsDirty != true)
            return true;

        MessageBoxResult result = MessageBox.Show(
            this,
            "You have unsaved changes. Do you want to continue?",
            "Unsaved Changes",
            MessageBoxButton.YesNo,
            MessageBoxImage.Warning);

        return result == MessageBoxResult.Yes;
    }

    private void ShowFileOperationError(string title, Exception ex)
    {
        MessageBox.Show(
            this,
            ex.Message,
            title,
            MessageBoxButton.OK,
            MessageBoxImage.Error);
    }

    private void SyncWebViewWithWorkspaceState()
    {
        if (ViewModel is null || !_isWebViewReady)
            return;

        PostWorkspaceMode(ViewModel.WorkspaceMode);
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

    private void WorkspaceWebView_NavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs e)
    {
        _isWebViewReady = e.IsSuccess;
        if (e.IsSuccess)
        {
            WorkspaceLoaderOverlay.Visibility = Visibility.Collapsed;
        }

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

    protected override void OnSourceInitialized(EventArgs e)
    {
        base.OnSourceInitialized(e);

        HwndSource? source = PresentationSource.FromVisual(this) as HwndSource;
        source?.AddHook(WndProc);
    }

    private IntPtr WndProc(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
    {
        if (msg == WmGetMinMaxInfo)
        {
            UpdateMinMaxInfo(hwnd, lParam);
            handled = true;
        }

        return IntPtr.Zero;
    }

    private static void UpdateMinMaxInfo(IntPtr hwnd, IntPtr lParam)
    {
        MINMAXINFO mmi = Marshal.PtrToStructure<MINMAXINFO>(lParam);

        IntPtr monitor = MonitorFromWindow(hwnd, MonitorDefaultToNearest);
        if (monitor != IntPtr.Zero)
        {
            MONITORINFO monitorInfo = new();
            if (GetMonitorInfo(monitor, ref monitorInfo))
            {
                RECT workArea = monitorInfo.rcWork;
                RECT monitorArea = monitorInfo.rcMonitor;

                mmi.ptMaxPosition.x = Math.Abs(workArea.left - monitorArea.left);
                mmi.ptMaxPosition.y = Math.Abs(workArea.top - monitorArea.top);
                mmi.ptMaxSize.x = Math.Abs(workArea.right - workArea.left);
                mmi.ptMaxSize.y = Math.Abs(workArea.bottom - workArea.top);
            }
        }

        Marshal.StructureToPtr(mmi, lParam, true);
    }

    private static bool IsFileOperationException(Exception ex)
    {
        return ex is IOException
            or UnauthorizedAccessException
            or NotSupportedException
            or SecurityException
            or InvalidOperationException;
    }

    [DllImport("user32.dll")]
    private static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFO lpmi);

    [DllImport("user32.dll")]
    private static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint dwFlags);

    [StructLayout(LayoutKind.Sequential)]
    private struct POINT
    {
        public int x;
        public int y;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MINMAXINFO
    {
        public POINT ptReserved;
        public POINT ptMaxSize;
        public POINT ptMaxPosition;
        public POINT ptMinTrackSize;
        public POINT ptMaxTrackSize;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MONITORINFO
    {
        public int cbSize;
        public RECT rcMonitor;
        public RECT rcWork;
        public int dwFlags;

        public MONITORINFO()
        {
            cbSize = Marshal.SizeOf<MONITORINFO>();
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct RECT
    {
        public int left;
        public int top;
        public int right;
        public int bottom;
    }

    private sealed record WorkspaceModeMessage(string Type, string Mode);

    private sealed record LoadDocumentMessage(string Type, string Content, string FileName);
}
