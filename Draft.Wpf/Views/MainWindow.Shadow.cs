using System.Windows;

namespace Draft.Views;

public partial class MainWindow
{
    private MainWindowShadowWindow? _shadowWindow;

    private void InitializeShadowWindow()
    {
        if (_shadowWindow is not null)
            return;

        _shadowWindow = new MainWindowShadowWindow();
        SyncShadowWindow();
    }

    private void SyncShadowWindow()
    {
        bool isShadowVisible = IsVisible
            && WindowState == WindowState.Normal
            && !IsWindowSnapped;

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

        MainWindowShadowWindow shadowWindow = _shadowWindow;
        _shadowWindow = null;
        shadowWindow.Close();
    }
}
