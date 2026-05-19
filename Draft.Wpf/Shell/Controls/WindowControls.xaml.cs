using System.Windows;
using System.Windows.Controls;

namespace Draft.Shell.Controls;

public partial class WindowControls : UserControl
{
    public WindowControls()
    {
        InitializeComponent();
    }

    private void Minimize_Click(object sender, RoutedEventArgs e)
    {
        Window? window = Window.GetWindow(this);

        if (window is null)
            return;

        SystemCommands.MinimizeWindow(window);
    }

    private void MaxRestore_Click(object sender, RoutedEventArgs e)
    {
        Window? window = Window.GetWindow(this);

        if (window is null)
            return;

        if (window.WindowState == WindowState.Maximized)
            SystemCommands.RestoreWindow(window);
        else
            SystemCommands.MaximizeWindow(window);
    }

    private void Close_Click(object sender, RoutedEventArgs e)
    {
        Window? window = Window.GetWindow(this);

        if (window is null)
            return;

        SystemCommands.CloseWindow(window);
    }
}
