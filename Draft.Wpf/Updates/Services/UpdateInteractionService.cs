using Draft.Dialogs.Message.Models;
using Draft.Dialogs.Message.Services;
using Draft.Settings.ViewModels;
using Draft.Settings.Views;
using Draft.Shell.ViewModels;
using Draft.Shell.Views;
using Draft.Updates.Models;
using System.Windows;

namespace Draft.Updates.Services;

public sealed class UpdateInteractionService
{
    private const string OpenUpdateSettingsResultId = "open-update-settings";
    private readonly IMessageDialogService _messageDialogService;

    public UpdateInteractionService()
        : this(new MessageDialogService())
    {
    }

    public UpdateInteractionService(IMessageDialogService messageDialogService)
    {
        _messageDialogService = messageDialogService;
    }

    public bool PromptToOpenUpdateSettings(UpdateCheckResult result)
    {
        MessageDialogResult installResult = _messageDialogService.ShowMessage(
            new MessageDialogRequest(
                "Update Available",
                $"Draft {result.Version} is available. Open Settings to install it from About?",
                MessageDialogType.Info,
                new[]
                {
                    MessageDialogButtonDefinition.Secondary("Cancel", MessageDialogResult.Cancel),
                    MessageDialogButtonDefinition.Primary("Open Settings", new MessageDialogResult(OpenUpdateSettingsResultId)),
                }));

        return installResult.Id == OpenUpdateSettingsResultId;
    }

    public void OpenAboutSettings()
    {
        Application.Current.Dispatcher.Invoke(() =>
        {
            if (Application.Current.MainWindow is MainWindow mainWindow)
            {
                mainWindow.ShowSettings(SettingsPage.About);
                return;
            }

            SettingsWindow settingsWindow = new(SettingsPage.About)
            {
                WindowStartupLocation = WindowStartupLocation.CenterScreen,
            };
            settingsWindow.ShowDialog();
        });
    }

    public bool CanRestartForUpdate()
    {
        MainWindowViewModel? viewModel =
            Application.Current?.MainWindow?.DataContext as MainWindowViewModel;

        if (viewModel is null || !viewModel.HasUnsavedWork)
            return true;

        ShowMessage(
            "Unsaved Changes",
            "Draft has unsaved work. Save or discard your changes before installing the update.",
            MessageDialogType.Warning);

        return false;
    }

    public void ShowMessage(
        string title,
        string description,
        MessageDialogType dialogType)
    {
        _messageDialogService.ShowMessage(
            new MessageDialogRequest(
                title,
                description,
                dialogType,
                new[]
                {
                    MessageDialogButtonDefinition.Primary("Okay", MessageDialogResult.Ok),
                }));
    }

    public void InvokeOnUiThread(Action action)
    {
        Application.Current.Dispatcher.Invoke(action);
    }
}
