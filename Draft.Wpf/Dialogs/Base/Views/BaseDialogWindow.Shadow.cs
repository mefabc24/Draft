using Draft.Helpers;
using System.Windows;

namespace Draft.Dialogs.Base.Views;

public partial class BaseDialogWindow
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
        PlaceShadowBehindBaseDialogWindow();
    }

    private void BaseDialogWindow_PositionChanged(object? sender, EventArgs e)
    {
        SyncShadowWindow();
    }

    private void BaseDialogWindow_SizeChanged(object sender, SizeChangedEventArgs e)
    {
        SyncShadowWindow();
    }

    private void InitializeShadowWindow()
    {
        if (_shadowWindow is not null)
            return;

        _shadowWindow = new WindowShadowWindow("Brush.Background.Surface");
        SyncShadowWindow();
    }

    private void SyncShadowWindow()
    {
        bool isShadowVisible = IsVisible && WindowState == WindowState.Normal;

        if (_shadowWindow is not null)
        {
            _shadowWindow.CornerRadius = DialogFrameBorder.CornerRadius;
        }

        _shadowWindow?.SyncWith(this, isShadowVisible);
    }

    private void PlaceShadowBehindBaseDialogWindow()
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
