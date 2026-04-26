using Draft.ViewModels;
using Microsoft.Web.WebView2.Core;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;

namespace Draft;

public partial class MainWindow : Window
{
    private const int WmGetMinMaxInfo = 0x0024;
    private const uint MonitorDefaultToNearest = 0x00000002;
    private MainWindowViewModel? ViewModel => DataContext as MainWindowViewModel;

    public MainWindow()
    {
        InitializeComponent();
        DataContext = new MainWindowViewModel();
        Loaded += MainWindow_Loaded;
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        string outputWebRootPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "Web"));
        string sourceWebRootPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "Draft.Web", "dist"));
        string webRootPath = Directory.Exists(sourceWebRootPath) ? sourceWebRootPath : outputWebRootPath;

        await WorkspaceWebView.EnsureCoreWebView2Async();

        WorkspaceWebView.CoreWebView2.SetVirtualHostNameToFolderMapping("app", webRootPath, CoreWebView2HostResourceAccessKind.Allow);

        WorkspaceWebView.Source = new Uri("https://app/index.html");

        SyncWebViewWithWorkspaceState();
        if (ViewModel is not null)
        {
            ViewModel.PropertyChanged += ViewModel_PropertyChanged;
        }
    }

    protected override void OnClosed(EventArgs e)
    {
        if (ViewModel is not null)
        {
            ViewModel.PropertyChanged -= ViewModel_PropertyChanged;
        }

        base.OnClosed(e);
    }

    private void ViewModel_PropertyChanged(object? sender, System.ComponentModel.PropertyChangedEventArgs e)
    {
        if (e.PropertyName == nameof(MainWindowViewModel.WorkspaceState))
        {
            SyncWebViewWithWorkspaceState();
        }
    }

    private void SyncWebViewWithWorkspaceState()
    {
        if (ViewModel is null)
            return;

        switch (ViewModel.WorkspaceState)
        {
            case WorkspaceState.Editor:
                _ = WorkspaceWebView.CoreWebView2?.ExecuteScriptAsync("window.dispatchEvent(new CustomEvent('workspace-mode-changed', { detail: 'editor' }));");
                break;
            case WorkspaceState.Split:
                _ = WorkspaceWebView.CoreWebView2?.ExecuteScriptAsync("window.dispatchEvent(new CustomEvent('workspace-mode-changed', { detail: 'split' }));");
                break;
            case WorkspaceState.Preview:
                _ = WorkspaceWebView.CoreWebView2?.ExecuteScriptAsync("window.dispatchEvent(new CustomEvent('workspace-mode-changed', { detail: 'preview' }));");
                break;
        }
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
}