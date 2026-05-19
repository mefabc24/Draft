using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;
using System.Windows.Media;

namespace Draft.Shell.Views;

public partial class MainWindow
{
    private const int WmSize = 0x0005;
    private const int WmGetMinMaxInfo = 0x0024;
    private const int WmWindowPosChanged = 0x0047;
    private const int DwmWindowCornerPreference = 33;
    private const uint MonitorDefaultToNearest = 0x00000002;
    private const int SnapDetectionPixelTolerance = 24;
    private const int DwmWindowCornerPreferenceDefault = 0;
    private const int DwmWindowCornerPreferenceDoNotRound = 1;

    protected override void OnSourceInitialized(EventArgs e)
    {
        base.OnSourceInitialized(e);

        HwndSource? source = PresentationSource.FromVisual(this) as HwndSource;
        source?.AddHook(WndProc);
        UpdateWindowSnapState();
        InitializeShadowWindow();
    }

    private IntPtr WndProc(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
    {
        if (msg == WmGetMinMaxInfo)
        {
            UpdateMinMaxInfo(hwnd, lParam);
            handled = true;
        }
        else if (msg == WmSize || msg == WmWindowPosChanged)
        {
            Dispatcher.BeginInvoke(UpdateWindowSnapState);
        }

        return IntPtr.Zero;
    }

    private void UpdateMinMaxInfo(IntPtr hwnd, IntPtr lParam)
    {
        MINMAXINFO mmi = Marshal.PtrToStructure<MINMAXINFO>(lParam);
        DpiScale dpi = VisualTreeHelper.GetDpi(this);

        mmi.ptMinTrackSize.x = ToDevicePixels(MinWidth, dpi.DpiScaleX);
        mmi.ptMinTrackSize.y = ToDevicePixels(MinHeight, dpi.DpiScaleY);

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

        Marshal.StructureToPtr(mmi, lParam, false);
    }

    private static int ToDevicePixels(double value, double scale)
    {
        if (double.IsNaN(value) || double.IsInfinity(value) || value <= 0)
            return 0;

        return (int)Math.Ceiling(value * scale);
    }

    private void UpdateWindowSnapState()
    {
        IsWindowSnapped = WindowState == WindowState.Normal && IsSnappedToWorkArea();
        UpdateNativeWindowCornerPreference();
    }

    private bool IsSnappedToWorkArea()
    {
        IntPtr hwnd = new WindowInteropHelper(this).Handle;
        if (hwnd == IntPtr.Zero || !GetWindowRect(hwnd, out RECT windowRect))
            return false;

        IntPtr monitor = MonitorFromWindow(hwnd, MonitorDefaultToNearest);
        if (monitor == IntPtr.Zero)
            return false;

        MONITORINFO monitorInfo = new();
        if (!GetMonitorInfo(monitor, ref monitorInfo))
            return false;

        RECT workArea = monitorInfo.rcWork;
        bool spansWorkAreaHeight = AreClose(windowRect.top, workArea.top)
            && AreClose(windowRect.bottom, workArea.bottom);
        bool spansWorkAreaWidth = AreClose(windowRect.left, workArea.left)
            && AreClose(windowRect.right, workArea.right);
        bool touchesHorizontalWorkAreaEdge = AreClose(windowRect.left, workArea.left)
            || AreClose(windowRect.right, workArea.right);
        bool touchesVerticalWorkAreaEdge = AreClose(windowRect.top, workArea.top)
            || AreClose(windowRect.bottom, workArea.bottom);

        return (spansWorkAreaHeight && touchesHorizontalWorkAreaEdge)
            || (spansWorkAreaWidth && touchesVerticalWorkAreaEdge)
            || (touchesHorizontalWorkAreaEdge && touchesVerticalWorkAreaEdge);
    }

    private static bool AreClose(int first, int second)
    {
        return Math.Abs(first - second) <= SnapDetectionPixelTolerance;
    }

    private void UpdateNativeWindowCornerPreference()
    {
        IntPtr hwnd = new WindowInteropHelper(this).Handle;
        if (hwnd == IntPtr.Zero)
            return;

        int preference = WindowState == WindowState.Maximized || IsWindowSnapped
            ? DwmWindowCornerPreferenceDoNotRound
            : DwmWindowCornerPreferenceDefault;

        _ = DwmSetWindowAttribute(
            hwnd,
            DwmWindowCornerPreference,
            ref preference,
            sizeof(int));
    }

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(
        IntPtr hwnd,
        int dwAttribute,
        ref int pvAttribute,
        int cbAttribute);

    [DllImport("user32.dll")]
    private static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFO lpmi);

    [DllImport("user32.dll")]
    private static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

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
