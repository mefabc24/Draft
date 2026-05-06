using System.Windows;
using System.Windows.Controls;

namespace Draft.Popup.DraftPrompt.Views;

public partial class DraftPromptWindow : Window
{
    public static readonly DependencyProperty PromptContentProperty =
        DependencyProperty.Register(
            nameof(PromptContent),
            typeof(object),
            typeof(DraftPromptWindow),
            new PropertyMetadata(null));

    public static readonly DependencyProperty PromptActionsProperty =
        DependencyProperty.Register(
            nameof(PromptActions),
            typeof(IEnumerable<UIElement>),
            typeof(DraftPromptWindow),
            new PropertyMetadata(null, OnPromptActionsChanged));

    public DraftPromptWindow()
    {
        InitializeComponent();
    }

    public DraftPromptWindow(
        string title,
        object? promptContent,
        IEnumerable<UIElement>? promptActions)
        : this()
    {
        Title = title;
        PromptContent = promptContent;
        PromptActions = promptActions;
    }

    public object? PromptContent
    {
        get => GetValue(PromptContentProperty);
        set => SetValue(PromptContentProperty, value);
    }

    public IEnumerable<UIElement>? PromptActions
    {
        get => (IEnumerable<UIElement>?)GetValue(PromptActionsProperty);
        set => SetValue(PromptActionsProperty, value);
    }

    private static void OnPromptActionsChanged(
        DependencyObject dependencyObject,
        DependencyPropertyChangedEventArgs e)
    {
        ((DraftPromptWindow)dependencyObject).PopulatePromptActions(
            e.NewValue as IEnumerable<UIElement>);
    }

    private void PopulatePromptActions(IEnumerable<UIElement>? actions)
    {
        PromptActionsPanel.Children.Clear();

        if (actions is null)
        {
            PromptActionsContainer.Visibility = Visibility.Collapsed;
            return;
        }

        foreach (UIElement action in actions)
        {
            if (action is Button button)
            {
                button.ClearValue(HeightProperty);
                button.VerticalAlignment = VerticalAlignment.Stretch;
            }

            PromptActionsPanel.Children.Add(action);
        }

        PromptActionsContainer.Visibility = PromptActionsPanel.Children.Count > 0
            ? Visibility.Visible
            : Visibility.Collapsed;
    }

    private void CloseButton_Click(object sender, RoutedEventArgs e)
    {
        Close();
    }
}
