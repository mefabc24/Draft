using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;

namespace Draft.Settings.Controls;

public static class ComboBoxScrollAssist
{
    public static readonly DependencyProperty UseSingleItemMouseWheelProperty =
        DependencyProperty.RegisterAttached(
            "UseSingleItemMouseWheel",
            typeof(bool),
            typeof(ComboBoxScrollAssist),
            new PropertyMetadata(false, OnUseSingleItemMouseWheelChanged));

    public static bool GetUseSingleItemMouseWheel(DependencyObject element)
    {
        return (bool)element.GetValue(UseSingleItemMouseWheelProperty);
    }

    public static void SetUseSingleItemMouseWheel(DependencyObject element, bool value)
    {
        element.SetValue(UseSingleItemMouseWheelProperty, value);
    }

    private static void OnUseSingleItemMouseWheelChanged(
        DependencyObject element,
        DependencyPropertyChangedEventArgs e)
    {
        if (element is not ScrollViewer scrollViewer)
            return;

        scrollViewer.PreviewMouseWheel -= OnPreviewMouseWheel;

        if (e.NewValue is true)
            scrollViewer.PreviewMouseWheel += OnPreviewMouseWheel;
    }

    private static void OnPreviewMouseWheel(object sender, MouseWheelEventArgs e)
    {
        if (sender is not ScrollViewer scrollViewer || e.Delta == 0)
            return;

        if (e.Delta < 0)
            scrollViewer.LineDown();
        else
            scrollViewer.LineUp();

        e.Handled = true;
    }
}
