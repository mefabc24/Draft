using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Threading;

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
    private const uint EventSystemForeground = 0x0003;
    private const uint WinEventOutOfContext = 0x0000;

    private readonly Border _shadowFrame;
    private readonly WinEventDelegate _winEventDelegate;
    private IntPtr _foregroundChangedHook;
    private Window? _trackedOwner;

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
        _winEventDelegate = WinEventProc;

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
        TrackOwner(owner);
        SyncOwnerGroup(owner);

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

        _foregroundChangedHook = SetWinEventHook(
            EventSystemForeground,
            EventSystemForeground,
            IntPtr.Zero,
            _winEventDelegate,
            0,
            0,
            WinEventOutOfContext);
    }

    protected override void OnClosed(EventArgs e)
    {
        if (_foregroundChangedHook != IntPtr.Zero)
        {
            _ = UnhookWinEvent(_foregroundChangedHook);
            _foregroundChangedHook = IntPtr.Zero;
        }

        StopTrackingOwner();
        base.OnClosed(e);
    }

    private void SyncOwnerGroup(Window owner)
    {
        if (!IsVisible && !ReferenceEquals(Owner, owner.Owner))
        {
            Owner = owner.Owner;
        }
    }

    private void TrackOwner(Window owner)
    {
        if (ReferenceEquals(_trackedOwner, owner))
            return;

        StopTrackingOwner();
        _trackedOwner = owner;
        owner.Activated += Owner_ActivationChanged;
        owner.Deactivated += Owner_ActivationChanged;
        owner.Closed += Owner_Closed;
    }

    private void StopTrackingOwner()
    {
        if (_trackedOwner is null)
            return;

        _trackedOwner.Activated -= Owner_ActivationChanged;
        _trackedOwner.Deactivated -= Owner_ActivationChanged;
        _trackedOwner.Closed -= Owner_Closed;
        _trackedOwner = null;
    }

    private void Owner_ActivationChanged(object? sender, EventArgs e)
    {
        QueuePlaceBehind();
    }

    private void WinEventProc(
        IntPtr winEventHook,
        uint eventType,
        IntPtr windowHandle,
        int objectId,
        int childId,
        uint eventThread,
        uint eventTime)
    {
        QueuePlaceBehind();
    }

    private void QueuePlaceBehind()
    {
        Window? owner = _trackedOwner;

        if (owner is null || owner.Dispatcher.HasShutdownStarted)
            return;

        _ = owner.Dispatcher.BeginInvoke(
            DispatcherPriority.ContextIdle,
            new Action(() =>
            {
                if (ReferenceEquals(_trackedOwner, owner)
                    && owner.IsVisible
                    && IsVisible)
                {
                    PlaceBehind(owner);
                }
            }));
    }

    private void Owner_Closed(object? sender, EventArgs e)
    {
        StopTrackingOwner();
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

    [DllImport("user32.dll")]
    private static extern IntPtr SetWinEventHook(
        uint eventMin,
        uint eventMax,
        IntPtr eventHookModule,
        WinEventDelegate eventDelegate,
        uint processId,
        uint threadId,
        uint flags);

    [DllImport("user32.dll")]
    private static extern bool UnhookWinEvent(IntPtr winEventHook);

    private delegate void WinEventDelegate(
        IntPtr winEventHook,
        uint eventType,
        IntPtr windowHandle,
        int objectId,
        int childId,
        uint eventThread,
        uint eventTime);
}
