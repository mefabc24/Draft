using System.Windows;

namespace Draft.Settings.Views;

public partial class SettingsWindow
{
    private WindowShadowWindow? _shadowWindow;

    protected override void OnSourceInitialized(EventArgs e)
    {
        base.OnSourceInitialized(e);
        InitializeShadowWindow();
    }

    protected override void OnActivated(EventArgs e)
    {
        base.OnActivated(e);
        PlaceShadowBehindSettingsWindow();
    }

    private void SettingsWindow_PositionChanged(object? sender, EventArgs e)
    {
        SyncShadowWindow();
    }

    private void SettingsWindow_SizeChanged(object sender, SizeChangedEventArgs e)
    {
        SyncShadowWindow();
    }

    private void InitializeShadowWindow()
    {
        if (_shadowWindow is not null)
            return;

        _shadowWindow = new WindowShadowWindow("Brush.Island");
        SyncShadowWindow();
    }

    private void SyncShadowWindow()
    {
        bool isShadowVisible = IsVisible && WindowState == WindowState.Normal;

        if (_shadowWindow is not null)
        {
            _shadowWindow.CornerRadius = SettingsWindowFrameBorder.CornerRadius;
        }

        _shadowWindow?.SyncWith(this, isShadowVisible);
    }

    private void PlaceShadowBehindSettingsWindow()
    {
        _shadowWindow?.PlaceBehind(this);
    }

    private void CloseShadowWindow()
    {
        if (_shadowWindow is null)
            return;

        WindowShadowWindow shadowWindow = _shadowWindow;
        _shadowWindow = null;
        shadowWindow.Close();
    }
}
