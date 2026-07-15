using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;

namespace Draft.Shared.UI.Controls;

public static class ToolTipAssist
{
    private const int InitialShowDelayMilliseconds = 400;
    private const int BetweenShowDelayMilliseconds = 100;
    private const int ShowDurationMilliseconds = 5000;
    private const double ToolTipVerticalOffset = 8;
    private const double ShortcutSpacing = 28;
    private const double LabelMaxWidth = 320;

    public static readonly DependencyProperty TextProperty =
        DependencyProperty.RegisterAttached(
            "Text",
            typeof(string),
            typeof(ToolTipAssist),
            new PropertyMetadata(null, OnToolTipPropertyChanged));

    public static readonly DependencyProperty ShortcutProperty =
        DependencyProperty.RegisterAttached(
            "Shortcut",
            typeof(string),
            typeof(ToolTipAssist),
            new PropertyMetadata(null, OnToolTipPropertyChanged));

    private static readonly DependencyProperty IsManagedToolTipProperty =
        DependencyProperty.RegisterAttached(
            "IsManagedToolTip",
            typeof(bool),
            typeof(ToolTipAssist),
            new PropertyMetadata(false));

    public static string? GetText(DependencyObject element)
    {
        return (string?)element.GetValue(TextProperty);
    }

    public static void SetText(DependencyObject element, string? value)
    {
        element.SetValue(TextProperty, value);
    }

    public static string? GetShortcut(DependencyObject element)
    {
        return (string?)element.GetValue(ShortcutProperty);
    }

    public static void SetShortcut(DependencyObject element, string? value)
    {
        element.SetValue(ShortcutProperty, value);
    }

    private static bool GetIsManagedToolTip(DependencyObject element)
    {
        return (bool)element.GetValue(IsManagedToolTipProperty);
    }

    private static void SetIsManagedToolTip(DependencyObject element, bool value)
    {
        element.SetValue(IsManagedToolTipProperty, value);
    }

    private static void OnToolTipPropertyChanged(
        DependencyObject element,
        DependencyPropertyChangedEventArgs e)
    {
        UpdateToolTip(element);
    }

    private static void UpdateToolTip(DependencyObject element)
    {
        if (element is not FrameworkElement frameworkElement)
            return;

        string text = GetText(element)?.Trim() ?? string.Empty;

        if (string.IsNullOrEmpty(text))
        {
            if (GetIsManagedToolTip(element))
            {
                frameworkElement.ClearValue(FrameworkElement.ToolTipProperty);
                SetIsManagedToolTip(element, false);
            }

            return;
        }

        string shortcut = GetShortcut(element)?.Trim() ?? string.Empty;

        frameworkElement.ToolTip = new ToolTip
        {
            Content = CreateContent(text, shortcut),
            Placement = PlacementMode.Bottom,
            VerticalOffset = ToolTipVerticalOffset,
        };

        ToolTipService.SetInitialShowDelay(frameworkElement, InitialShowDelayMilliseconds);
        ToolTipService.SetBetweenShowDelay(frameworkElement, BetweenShowDelayMilliseconds);
        ToolTipService.SetShowDuration(frameworkElement, ShowDurationMilliseconds);
        ToolTipService.SetShowOnDisabled(frameworkElement, true);
        SetIsManagedToolTip(element, true);
    }

    private static object CreateContent(string text, string shortcut)
    {
        TextBlock label = CreateTextBlock(text);

        if (string.IsNullOrEmpty(shortcut))
            return label;

        Grid layout = new();
        layout.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        layout.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

        TextBlock shortcutText = CreateTextBlock(shortcut);
        shortcutText.Margin = new Thickness(ShortcutSpacing, 0, 0, 0);
        shortcutText.FontWeight = FontWeights.Medium;
        shortcutText.Opacity = 0.9;
        shortcutText.SetResourceReference(TextBlock.ForegroundProperty, "Brush.Accent.Primary");

        Grid.SetColumn(label, 0);
        Grid.SetColumn(shortcutText, 1);
        layout.Children.Add(label);
        layout.Children.Add(shortcutText);

        return layout;
    }

    private static TextBlock CreateTextBlock(string text)
    {
        TextBlock textBlock = new()
        {
            Text = text,
            MaxWidth = LabelMaxWidth,
            TextTrimming = TextTrimming.CharacterEllipsis,
            VerticalAlignment = VerticalAlignment.Center,
        };

        textBlock.SetResourceReference(TextBlock.ForegroundProperty, "Brush.Text.Primary");

        return textBlock;
    }
}
