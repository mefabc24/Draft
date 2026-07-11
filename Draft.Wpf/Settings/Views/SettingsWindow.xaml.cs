using Draft.Dialogs.Message.Models;
using Draft.Dialogs.Message.Services;
using Draft.Settings.ViewModels;
using System.Windows;

namespace Draft.Settings.Views;

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

        SettingsWindowViewModel viewModel = new();
        viewModel.SelectSettingsPage(initialPage);
        viewModel.CloseRequested += ViewModel_CloseRequested;
        viewModel.ResetConfirmationRequested += ViewModel_ResetConfirmationRequested;
        viewModel.SettingsApplied += ViewModel_SettingsApplied;
        DataContext = viewModel;
    }

    private void CloseButton_Click(object sender, RoutedEventArgs e)
    {
        if (DataContext is SettingsWindowViewModel viewModel)
        {
            viewModel.CancelChanges();
            return;
        }

        Close();
    }

    protected override void OnClosed(EventArgs e)
    {
        if (DataContext is SettingsWindowViewModel viewModel)
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
        string appLanguage = sender is SettingsWindowViewModel viewModel
            ? viewModel.AppLanguage
            : AppSettingsStore.DefaultAppLanguage;

        MessageDialogResult result = _messageDialogService.ShowMessage(
            new MessageDialogRequest(
                LocalizationService.Translate("settings.resetDefaults.title", "Reset Settings", appLanguage),
                LocalizationService.Translate(
                    "settings.resetDefaults.description",
                    "Reset all settings to their default values? This will be saved immediately.",
                    appLanguage),
                MessageDialogType.Warning,
                new[]
                {
                    MessageDialogButtonDefinition.Secondary(
                        LocalizationService.Translate("common.cancel", "Cancel", appLanguage),
                        MessageDialogResult.Cancel),
                    MessageDialogButtonDefinition.Primary(
                        LocalizationService.Translate("common.reset", "Reset", appLanguage),
                        new MessageDialogResult("reset")),
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
