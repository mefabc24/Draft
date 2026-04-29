using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;
using System.Windows.Media;

namespace Draft.Views;

public partial class MainWindow
{
    private const int WmGetMinMaxInfo = 0x0024;
    private const uint MonitorDefaultToNearest = 0x00000002;

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
