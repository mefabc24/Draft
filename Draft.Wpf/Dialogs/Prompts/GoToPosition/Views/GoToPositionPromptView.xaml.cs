using Draft.Dialogs.Prompts.GoToPosition.ViewModels;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Threading;

namespace Draft.Dialogs.Prompts.GoToPosition.Views;

public partial class GoToPositionPromptView : UserControl
{
    public GoToPositionPromptView()
    {
        InitializeComponent();
        Loaded += GoToPositionPromptView_Loaded;
        PreviewKeyDown += GoToPositionPromptView_PreviewKeyDown;
        PreviewTextInput += GoToPositionPromptView_PreviewTextInput;
    }

    private GoToPositionPromptViewModel? ViewModel => DataContext as GoToPositionPromptViewModel;

    private void GoToPositionPromptView_Loaded(object sender, System.Windows.RoutedEventArgs e)
    {
        Dispatcher.BeginInvoke(
            new Action(FocusPositionInput),
            DispatcherPriority.ApplicationIdle);
    }

    private void GoToPositionPromptView_PreviewKeyDown(object sender, KeyEventArgs e)
    {
        if (e.Key == Key.Enter)
        {
            e.Handled = true;
            ViewModel?.ConfirmCommand.Execute(null);

            if (ViewModel?.Result.IsConfirmed != true)
            {
                FocusPositionInput();
            }
        }
        else if (e.Key == Key.Escape)
        {
            e.Handled = true;
            ViewModel?.CancelCommand.Execute(null);
        }
    }

    private void GoToPositionPromptView_PreviewTextInput(object sender, TextCompositionEventArgs e)
    {
        if (e.OriginalSource is TextBox)
            return;

        PositionTextBox.Focus();
        PositionTextBox.Text = e.Text;
        PositionTextBox.CaretIndex = PositionTextBox.Text.Length;
        e.Handled = true;
    }

    private void FocusPositionInput()
    {
        PositionTextBox.Focus();
        Keyboard.Focus(PositionTextBox);
        PositionTextBox.SelectAll();
    }
}
