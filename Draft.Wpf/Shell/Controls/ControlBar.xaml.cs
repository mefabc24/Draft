using System.Diagnostics;
using System.Windows;
using System.Windows.Controls;

namespace Draft.Shell.Controls;

public partial class ControlBar : UserControl
{
    private const string ProjectUrl = "https://github.com/mefabc24/Draft";

    public ControlBar()
    {
        InitializeComponent();
    }

    private void LogoButton_Click(object sender, RoutedEventArgs e)
    {
        Process.Start(new ProcessStartInfo(ProjectUrl)
        {
            UseShellExecute = true,
        });
    }
}
