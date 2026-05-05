using System.Windows;
using System.Windows.Controls;
using System.Windows.Markup;

namespace Draft.Wpf.Controls.Settings;

[ContentProperty(nameof(CardContent))]
public partial class SettingCard : UserControl
{
    public static readonly DependencyProperty TitleProperty =
        DependencyProperty.Register(
            nameof(Title),
            typeof(string),
            typeof(SettingCard),
            new PropertyMetadata(string.Empty));

    public static readonly DependencyProperty DescriptionProperty =
        DependencyProperty.Register(
            nameof(Description),
            typeof(string),
            typeof(SettingCard),
            new PropertyMetadata(string.Empty));

    public static readonly DependencyProperty CardContentProperty =
        DependencyProperty.Register(
            nameof(CardContent),
            typeof(object),
            typeof(SettingCard),
            new PropertyMetadata(null));

    public SettingCard()
    {
        InitializeComponent();
    }

    public string Title
    {
        get => (string)GetValue(TitleProperty);
        set => SetValue(TitleProperty, value);
    }

    public string Description
    {
        get => (string)GetValue(DescriptionProperty);
        set => SetValue(DescriptionProperty, value);
    }

    public object? CardContent
    {
        get => GetValue(CardContentProperty);
        set => SetValue(CardContentProperty, value);
    }
}
