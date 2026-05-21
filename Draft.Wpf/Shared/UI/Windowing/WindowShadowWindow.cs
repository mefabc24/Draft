using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Interop;
using System.Windows.Media;

namespace Draft.Shared.UI.Windowing;

internal sealed class WindowShadowWindow : Window
{
    public const double ShadowMargin = 24;

    private const int GwlExStyle = -20;
    private const int SwpNoActivate = 0x0010;
    private const int SwpNoMove = 0x0002;
    private const int SwpNoSize = 0x0001;
    private const int SwpNoOwnerZOrder = 0x0200;
    private const int WsExTransparent = 0x00000020;
    private const int WsExToolWindow = 0x00000080;
    private const int WsExNoActivate = 0x08000000;

    private readonly Border _shadowFrame;

    public WindowShadowWindow(string backgroundResourceKey)
    {
        AllowsTransparency = true;
        Background = Brushes.Transparent;
        Focusable = false;
        IsHitTestVisible = false;
        ResizeMode = ResizeMode.NoResize;
        ShowActivated = false;
        ShowInTaskbar = false;
        WindowStartupLocation = WindowStartupLocation.Manual;
        WindowStyle = WindowStyle.None;

        _shadowFrame = new Border
        {
            Margin = new Thickness(ShadowMargin),
            Background = FindBrush(backgroundResourceKey, Brushes.Black),
            CornerRadius = new CornerRadius(8),
            Effect = new System.Windows.Media.Effects.DropShadowEffect
            {
                BlurRadius = 24,
                Direction = 270,
                Opacity = 0.28,
                ShadowDepth = 6,
                Color = FindColor("Color.Shadow.Default", Colors.Black),
            },
        };

        Content = _shadowFrame;
        SourceInitialized += WindowShadowWindow_SourceInitialized;
    }

    public CornerRadius CornerRadius
    {
        get => _shadowFrame.CornerRadius;
        set => _shadowFrame.CornerRadius = value;
    }

    public void SyncWith(Window owner, bool isShadowVisible)
    {
        if (!isShadowVisible)
        {
            Hide();
            return;
        }

        double ownerWidth = owner.ActualWidth > 0 ? owner.ActualWidth : owner.Width;
        double ownerHeight = owner.ActualHeight > 0 ? owner.ActualHeight : owner.Height;

        if (double.IsNaN(ownerWidth)
            || double.IsNaN(ownerHeight)
            || ownerWidth <= 0
            || ownerHeight <= 0)
        {
            Hide();
            return;
        }

        Left = owner.Left - ShadowMargin;
        Top = owner.Top - ShadowMargin;
        Width = ownerWidth + (ShadowMargin * 2);
        Height = ownerHeight + (ShadowMargin * 2);

        if (!IsVisible)
        {
            Show();
        }

        PlaceBehind(owner);
    }

    public void PlaceBehind(Window owner)
    {
        IntPtr shadowHandle = new WindowInteropHelper(this).Handle;
        IntPtr ownerHandle = new WindowInteropHelper(owner).Handle;

        if (shadowHandle == IntPtr.Zero || ownerHandle == IntPtr.Zero)
            return;

        _ = SetWindowPos(
            shadowHandle,
            ownerHandle,
            0,
            0,
            0,
            0,
            SwpNoActivate | SwpNoMove | SwpNoSize | SwpNoOwnerZOrder);
    }

    private void WindowShadowWindow_SourceInitialized(object? sender, EventArgs e)
    {
        IntPtr handle = new WindowInteropHelper(this).Handle;
        if (handle == IntPtr.Zero)
            return;

        nint extendedStyle = GetWindowLongPtr(handle, GwlExStyle);
        extendedStyle |= WsExTransparent | WsExToolWindow | WsExNoActivate;
        _ = SetWindowLongPtr(handle, GwlExStyle, extendedStyle);
    }

    private static Brush FindBrush(string key, Brush fallback)
    {
        return Application.Current?.TryFindResource(key) as Brush ?? fallback;
    }

    private static Color FindColor(string key, Color fallback)
    {
        return Application.Current?.TryFindResource(key) is Color color
            ? color
            : fallback;
    }

    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW")]
    private static extern nint GetWindowLongPtr(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtrW")]
    private static extern nint SetWindowLongPtr(IntPtr hWnd, int nIndex, nint dwNewLong);

    [DllImport("user32.dll")]
    private static extern bool SetWindowPos(
        IntPtr hWnd,
        IntPtr hWndInsertAfter,
        int x,
        int y,
        int cx,
        int cy,
        int uFlags);
}
