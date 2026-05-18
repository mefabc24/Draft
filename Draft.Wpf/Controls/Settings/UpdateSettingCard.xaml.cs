using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;

namespace Draft.Wpf.Controls.Settings;

public partial class UpdateSettingCard : UserControl
{
    public static readonly DependencyProperty TitleProperty =
        DependencyProperty.Register(
            nameof(Title),
            typeof(string),
            typeof(UpdateSettingCard),
            new PropertyMetadata(string.Empty));

    public static readonly DependencyProperty DescriptionProperty =
        DependencyProperty.Register(
            nameof(Description),
            typeof(string),
            typeof(UpdateSettingCard),
            new PropertyMetadata(string.Empty));

    public static readonly DependencyProperty StatusTextProperty =
        DependencyProperty.Register(
            nameof(StatusText),
            typeof(string),
            typeof(UpdateSettingCard),
            new PropertyMetadata(string.Empty));

    public static readonly DependencyProperty ActionTextProperty =
        DependencyProperty.Register(
            nameof(ActionText),
            typeof(string),
            typeof(UpdateSettingCard),
            new PropertyMetadata("Check for updates"));

    public static readonly DependencyProperty IsUpdateAvailableProperty =
        DependencyProperty.Register(
            nameof(IsUpdateAvailable),
            typeof(bool),
            typeof(UpdateSettingCard),
            new PropertyMetadata(false));

    public static readonly DependencyProperty IsActionEnabledProperty =
        DependencyProperty.Register(
            nameof(IsActionEnabled),
            typeof(bool),
            typeof(UpdateSettingCard),
            new PropertyMetadata(true));

    public static readonly DependencyProperty ActionCommandProperty =
        DependencyProperty.Register(
            nameof(ActionCommand),
            typeof(ICommand),
            typeof(UpdateSettingCard),
            new PropertyMetadata(null));

    public UpdateSettingCard()
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

    public string StatusText
    {
        get => (string)GetValue(StatusTextProperty);
        set => SetValue(StatusTextProperty, value);
    }

    public string ActionText
    {
        get => (string)GetValue(ActionTextProperty);
        set => SetValue(ActionTextProperty, value);
    }

    public bool IsUpdateAvailable
    {
        get => (bool)GetValue(IsUpdateAvailableProperty);
        set => SetValue(IsUpdateAvailableProperty, value);
    }

    public bool IsActionEnabled
    {
        get => (bool)GetValue(IsActionEnabledProperty);
        set => SetValue(IsActionEnabledProperty, value);
    }

    public ICommand? ActionCommand
    {
        get => (ICommand?)GetValue(ActionCommandProperty);
        set => SetValue(ActionCommandProperty, value);
    }
}
