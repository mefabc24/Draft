using System.Windows;

namespace Draft.Settings.Controls;

public static class SettingsSearch
{
    public static readonly DependencyProperty TargetIdProperty =
        DependencyProperty.RegisterAttached(
            "TargetId",
            typeof(string),
            typeof(SettingsSearch),
            new FrameworkPropertyMetadata(string.Empty));

    public static string GetTargetId(DependencyObject element)
        => (string)element.GetValue(TargetIdProperty);

    public static void SetTargetId(DependencyObject element, string value)
        => element.SetValue(TargetIdProperty, value);
}
