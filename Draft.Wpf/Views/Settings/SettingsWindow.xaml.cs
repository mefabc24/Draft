using Draft.Dialogs.Message.Models;
using Draft.Dialogs.Message.Services;
using Draft.Helpers;
using Draft.ViewModels;
using System.Windows;

namespace Draft.Views;

public partial class SettingsWindow : Window
{
    private readonly IMessageDialogService _messageDialogService = new MessageDialogService();

    public event EventHandler<SettingsAppliedEventArgs>? SettingsApplied;

    public SettingsWindow()
        : this(SettingsPage.General)
    {
    }

    public SettingsWindow(SettingsPage initialPage)
    {
        InitializeComponent();
        LocationChanged += SettingsWindow_PositionChanged;
        SizeChanged += SettingsWindow_SizeChanged;
        StateChanged += SettingsWindow_PositionChanged;

        SettingsViewModel viewModel = new();
        viewModel.SelectSettingsPage(initialPage);
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

        LocationChanged -= SettingsWindow_PositionChanged;
        SizeChanged -= SettingsWindow_SizeChanged;
        StateChanged -= SettingsWindow_PositionChanged;
        CloseShadowWindow();

        base.OnClosed(e);
    }

    private void ViewModel_ResetConfirmationRequested(
        object? sender,
        ResetConfirmationRequestedEventArgs e)
    {
        MessageDialogResult result = _messageDialogService.ShowMessage(
            new MessageDialogRequest(
                "Reset Settings",
                "Reset all settings to their default values? This will be saved immediately.",
                MessageDialogType.Warning,
                new[]
                {
                    MessageDialogButtonDefinition.Secondary("Cancel", MessageDialogResult.Cancel),
                    MessageDialogButtonDefinition.Primary("Reset", new MessageDialogResult("reset")),
                }));

        e.IsConfirmed = result.Id == "reset";
    }

    private void ViewModel_SettingsApplied(object? sender, SettingsAppliedEventArgs e)
    {
        SettingsApplied?.Invoke(this, e);
    }

    internal void NotifySettingsApplied(DraftSettings settings)
    {
        SettingsApplied?.Invoke(this, new SettingsAppliedEventArgs(settings));
    }

    private void ViewModel_CloseRequested(object? sender, EventArgs e)
    {
        Close();
    }
}
