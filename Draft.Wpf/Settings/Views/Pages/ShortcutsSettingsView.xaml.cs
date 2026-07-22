using System.Windows.Controls;

namespace Draft.Settings.Views.Pages;

public partial class ShortcutsSettingsView : UserControl
{
    public ShortcutsSettingsView()
    {
        InitializeComponent();
    }

    private void SearchTextBox_TextChanged(object sender, TextChangedEventArgs e)
    {
        ShortcutsScrollViewer?.ScrollToTop();
    }
}
