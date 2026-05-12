using System.Windows;

namespace Draft.Dialogs.Base.Views;

public partial class BaseDialogWindow : Window
{
    public BaseDialogWindow()
    {
        InitializeComponent();
    }

    public BaseDialogWindow(object content)
        : this()
    {
        DialogContentHost.Content = content;
    }
}
