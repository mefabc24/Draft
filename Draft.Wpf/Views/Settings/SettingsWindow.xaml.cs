using Draft.ViewModels;
using System.Windows;

namespace Draft.Views;

public partial class SettingsWindow : Window
{
    public event EventHandler<SettingsAppliedEventArgs>? SettingsApplied;

    public SettingsWindow()
    {
        InitializeComponent();
        SettingsViewModel viewModel = new();
        viewModel.CloseRequested += ViewModel_CloseRequested;
        viewModel.ResetConfirmationRequested += ViewModel_ResetConfirmationRequested;
        viewModel.SettingsApplied += ViewModel_SettingsApplied;
        DataContext = viewModel;
    }

    private void CloseButton_Click(object sender, RoutedEventArgs e)
    {
        if (DataContext is SettingsViewModel viewModel)
        {
            viewModel.CancelChanges();
            return;
        }

        Close();
    }

    protected override void OnClosed(EventArgs e)
    {
        if (DataContext is SettingsViewModel viewModel)
        {
            viewModel.CloseRequested -= ViewModel_CloseRequested;
            viewModel.ResetConfirmationRequested -= ViewModel_ResetConfirmationRequested;
            viewModel.SettingsApplied -= ViewModel_SettingsApplied;
        }

        base.OnClosed(e);
    }

    private void ViewModel_ResetConfirmationRequested(
        object? sender,
        ResetConfirmationRequestedEventArgs e)
    {
        MessageBoxResult result = MessageBox.Show(
            this,
            "Reset all settings controls to their default values? Changes are only saved when you apply them.",
            "Reset Settings",
            MessageBoxButton.YesNo,
            MessageBoxImage.Warning);

        e.IsConfirmed = result == MessageBoxResult.Yes;
    }

    private void ViewModel_SettingsApplied(object? sender, SettingsAppliedEventArgs e)
    {
        SettingsApplied?.Invoke(this, e);
    }

    private void ViewModel_CloseRequested(object? sender, EventArgs e)
    {
        Close();
    }
}
