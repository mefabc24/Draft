using Draft.Dialogs.Models;
using Draft.Dialogs.Services;
using Draft.ViewModels;
using System.Windows;

namespace Draft.Views;

public partial class SettingsWindow : Window
{
    private readonly IDraftDialogService _draftDialogService = new DraftDialogService();

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
        DraftDialogResult result = _draftDialogService.ShowMessage(
            new DraftMessageDialogRequest(
                "Reset Settings",
                "Reset all settings to their default values? This will be saved immediately.",
                DraftDialogType.Warning,
                new[]
                {
                    DraftDialogButtonDefinition.Secondary("Cancel", DraftDialogResult.Cancel),
                    DraftDialogButtonDefinition.Primary("Reset", new DraftDialogResult("reset")),
                }));

        e.IsConfirmed = result.Id == "reset";
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
