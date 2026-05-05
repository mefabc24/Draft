using System.Windows;
using System.Windows.Media;

namespace Draft.Controls;

public static class ControlButtonAssist
{
    public static readonly DependencyProperty CornerRadiusProperty =
        DependencyProperty.RegisterAttached(
            "CornerRadius",
            typeof(CornerRadius),
            typeof(ControlButtonAssist),
            new FrameworkPropertyMetadata(new CornerRadius()));

    public static readonly DependencyProperty CutoutBackgroundProperty =
        DependencyProperty.RegisterAttached(
            "CutoutBackground",
            typeof(Brush),
            typeof(ControlButtonAssist),
            new FrameworkPropertyMetadata(Brushes.Transparent, FrameworkPropertyMetadataOptions.Inherits));

    public static CornerRadius GetCornerRadius(DependencyObject element)
    {
        return (CornerRadius)element.GetValue(CornerRadiusProperty);
    }

    public static void SetCornerRadius(DependencyObject element, CornerRadius value)
    {
        element.SetValue(CornerRadiusProperty, value);
    }

    public static Brush GetCutoutBackground(DependencyObject element)
    {
        return (Brush)element.GetValue(CutoutBackgroundProperty);
    }

    public static void SetCutoutBackground(DependencyObject element, Brush value)
    {
        element.SetValue(CutoutBackgroundProperty, value);
    }
}
