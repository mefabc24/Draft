using Draft.Dialogs.ViewModels;
using System.Windows;

namespace Draft.Dialogs.Views;

public partial class DraftDialogWindow : Window
{
    public DraftDialogWindow(DraftMessageDialogViewModel viewModel)
    {
        InitializeComponent();
        DataContext = viewModel;
        viewModel.CloseRequested += ViewModel_CloseRequested;
    }

    protected override void OnClosed(EventArgs e)
    {
        if (DataContext is DraftMessageDialogViewModel viewModel)
        {
            viewModel.CloseRequested -= ViewModel_CloseRequested;
        }

        base.OnClosed(e);
    }

    private void ViewModel_CloseRequested(object? sender, EventArgs e)
    {
        DialogResult = true;
        Close();
    }
}
