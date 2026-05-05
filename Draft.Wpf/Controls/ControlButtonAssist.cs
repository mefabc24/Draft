using System.Windows;
using System.Windows.Media;

namespace Draft.Controls;

public static class ControlButtonAssist
{
    public static readonly DependencyProperty CutoutBackgroundProperty =
        DependencyProperty.RegisterAttached(
            "CutoutBackground",
            typeof(Brush),
            typeof(ControlButtonAssist),
            new FrameworkPropertyMetadata(Brushes.Transparent, FrameworkPropertyMetadataOptions.Inherits));

    public static Brush GetCutoutBackground(DependencyObject element)
    {
        return (Brush)element.GetValue(CutoutBackgroundProperty);
    }

    public static void SetCutoutBackground(DependencyObject element, Brush value)
    {
        element.SetValue(CutoutBackgroundProperty, value);
    }
}
