using Draft.Helpers;
using System.Windows;

namespace Draft.Views;

public partial class MainWindow
{
    private WindowShadowWindow? _shadowWindow;

    private void InitializeShadowWindow()
    {
        if (_shadowWindow is not null)
            return;

        _shadowWindow = new WindowShadowWindow("Brush.WindowBG");
        SyncShadowWindow();
    }

    private void SyncShadowWindow()
    {
        bool isShadowVisible = IsVisible
            && WindowState == WindowState.Normal
            && !IsWindowSnapped;

        if (_shadowWindow is not null)
        {
            _shadowWindow.CornerRadius = WindowFrameBorder.CornerRadius;
        }

        _shadowWindow?.SyncWith(this, isShadowVisible);
    }

    private void PlaceShadowBehindMainWindow()
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
