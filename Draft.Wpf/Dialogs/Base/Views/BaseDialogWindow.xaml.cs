using System.Windows;

namespace Draft.Dialogs.Base.Views;

public partial class BaseDialogWindow : Window
{
    public BaseDialogWindow()
    {
        InitializeComponent();
        LocationChanged += BaseDialogWindow_PositionChanged;
        SizeChanged += BaseDialogWindow_SizeChanged;
        StateChanged += BaseDialogWindow_PositionChanged;
    }

    public BaseDialogWindow(object content)
        : this()
    {
        DialogContentHost.Content = content;
    }

    protected override void OnClosed(EventArgs e)
    {
        LocationChanged -= BaseDialogWindow_PositionChanged;
        SizeChanged -= BaseDialogWindow_SizeChanged;
        StateChanged -= BaseDialogWindow_PositionChanged;
        CloseShadowWindow();

        base.OnClosed(e);
    }
}
