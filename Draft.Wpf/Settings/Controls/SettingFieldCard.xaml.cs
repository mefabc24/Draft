using System.Windows;
using System.Windows.Controls;
using System.Windows.Markup;

namespace Draft.Settings.Controls;

[ContentProperty(nameof(CardContent))]
public partial class SettingFieldCard : UserControl
{
    public static readonly DependencyProperty TitleProperty =
        DependencyProperty.Register(
            nameof(Title),
            typeof(string),
            typeof(SettingFieldCard),
            new PropertyMetadata(string.Empty));

    public static readonly DependencyProperty CardContentProperty =
        DependencyProperty.Register(
            nameof(CardContent),
            typeof(object),
            typeof(SettingFieldCard),
            new PropertyMetadata(null));

    public SettingFieldCard()
    {
        InitializeComponent();
    }

    public string Title
    {
        get => (string)GetValue(TitleProperty);
        set => SetValue(TitleProperty, value);
    }

    public object? CardContent
    {
        get => GetValue(CardContentProperty);
        set => SetValue(CardContentProperty, value);
    }
}
