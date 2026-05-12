using Draft.Dialogs.Message.Models;
using Draft.Dialogs.Message.Services;
using Draft.Dialogs.Prompt.GoToPosition.Models;
using Draft.Dialogs.Prompt.GoToPosition.Services;
using Draft.Helpers;
using System.Windows.Input;

namespace Draft.ViewModels;

public sealed class DevelopSettingsPageViewModel : SettingsPageViewModel
{
    private readonly IMessageDialogService _dialogService = new MessageDialogService();
    private readonly IGoToPositionPromptService _goToPositionPromptService = new GoToPositionPromptService();

    public DevelopSettingsPageViewModel(SettingsViewModel settings)
        : base("Develop", settings)
    {
        ShowInfoDialogCommand = new RelayCommand(() => ShowDialog(MessageDialogType.Info, InfoDialogButtonCount));
        ShowWarningDialogCommand = new RelayCommand(() => ShowDialog(MessageDialogType.Warning, WarningDialogButtonCount));
        ShowErrorDialogCommand = new RelayCommand(() => ShowDialog(MessageDialogType.Error, ErrorDialogButtonCount));
        ShowSuccessDialogCommand = new RelayCommand(() => ShowDialog(MessageDialogType.Success, SuccessDialogButtonCount));
        ShowPromptWindowCommand = new RelayCommand(ShowPromptWindow);
    }

    public IReadOnlyList<int> DialogButtonCountOptions { get; } = new[] { 1, 2, 3 };

    public int InfoDialogButtonCount { get; set; } = 1;

    public int WarningDialogButtonCount { get; set; } = 1;

    public int ErrorDialogButtonCount { get; set; } = 1;

    public int SuccessDialogButtonCount { get; set; } = 1;

    public ICommand ShowInfoDialogCommand { get; }

    public ICommand ShowWarningDialogCommand { get; }

    public ICommand ShowErrorDialogCommand { get; }

    public ICommand ShowSuccessDialogCommand { get; }

    public ICommand ShowPromptWindowCommand { get; }

    private void ShowPromptWindow()
    {
        _goToPositionPromptService.Show(new GoToPositionPromptRequest(1, 1));
    }

    private void ShowDialog(MessageDialogType dialogType, int buttonCount)
    {
        string title = dialogType switch
        {
            MessageDialogType.Info => "Info Dialog",
            MessageDialogType.Warning => "Warning Dialog",
            MessageDialogType.Error => "Error Dialog",
            MessageDialogType.Success => "Success Dialog",
            _ => "Dialog",
        };

        string description = dialogType switch
        {
            MessageDialogType.Info => "This is a development preview of an informational dialog.",
            MessageDialogType.Warning => "This is a development preview of a warning dialog.",
            MessageDialogType.Error => "This is a development preview of an error dialog.",
            MessageDialogType.Success => "This is a development preview of a success dialog.",
            _ => "This is a development preview dialog.",
        };

        _dialogService.ShowMessage(
            new MessageDialogRequest(
                title,
                description,
                dialogType,
                CreateButtonDefinitions(buttonCount)));
    }

    private static IReadOnlyList<MessageDialogButtonDefinition> CreateButtonDefinitions(int buttonCount)
    {
        return buttonCount switch
        {
            2 => new[]
            {
                MessageDialogButtonDefinition.Secondary("Cancel", MessageDialogResult.Cancel),
                MessageDialogButtonDefinition.Primary("Okay", MessageDialogResult.Ok),
            },
            3 => new[]
            {
                MessageDialogButtonDefinition.Secondary("Cancel", MessageDialogResult.Cancel),
                MessageDialogButtonDefinition.Secondary("Later", new MessageDialogResult("later")),
                MessageDialogButtonDefinition.Primary("Okay", MessageDialogResult.Ok),
            },
            _ => new[]
            {
                MessageDialogButtonDefinition.Primary("Okay", MessageDialogResult.Ok),
            },
        };
    }
}
