using Draft.Dialogs.Models;
using Draft.Dialogs.Services;
using Draft.Helpers;
using System.Windows.Input;

namespace Draft.ViewModels;

public sealed class DevelopSettingsPageViewModel : SettingsPageViewModel
{
    private readonly IDraftDialogService _dialogService = new DraftDialogService();

    public DevelopSettingsPageViewModel(SettingsViewModel settings)
        : base("Develop", settings)
    {
        ShowInfoDialogCommand = new RelayCommand(() => ShowDialog(DraftDialogType.Info, InfoDialogButtonCount));
        ShowWarningDialogCommand = new RelayCommand(() => ShowDialog(DraftDialogType.Warning, WarningDialogButtonCount));
        ShowErrorDialogCommand = new RelayCommand(() => ShowDialog(DraftDialogType.Error, ErrorDialogButtonCount));
        ShowSuccessDialogCommand = new RelayCommand(() => ShowDialog(DraftDialogType.Success, SuccessDialogButtonCount));
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

    private void ShowDialog(DraftDialogType dialogType, int buttonCount)
    {
        string title = dialogType switch
        {
            DraftDialogType.Info => "Info Dialog",
            DraftDialogType.Warning => "Warning Dialog",
            DraftDialogType.Error => "Error Dialog",
            DraftDialogType.Success => "Success Dialog",
            _ => "Dialog",
        };

        string description = dialogType switch
        {
            DraftDialogType.Info => "This is a development preview of an informational dialog.",
            DraftDialogType.Warning => "This is a development preview of a warning dialog.",
            DraftDialogType.Error => "This is a development preview of an error dialog.",
            DraftDialogType.Success => "This is a development preview of a success dialog.",
            _ => "This is a development preview dialog.",
        };

        _dialogService.ShowMessage(
            new DraftMessageDialogRequest(
                title,
                description,
                dialogType,
                CreateButtonDefinitions(buttonCount)));
    }

    private static IReadOnlyList<DraftDialogButtonDefinition> CreateButtonDefinitions(int buttonCount)
    {
        return buttonCount switch
        {
            2 => new[]
            {
                DraftDialogButtonDefinition.Secondary("Cancel", DraftDialogResult.Cancel),
                DraftDialogButtonDefinition.Primary("Okay", DraftDialogResult.Ok),
            },
            3 => new[]
            {
                DraftDialogButtonDefinition.Secondary("Cancel", DraftDialogResult.Cancel),
                DraftDialogButtonDefinition.Secondary("Later", new DraftDialogResult("later")),
                DraftDialogButtonDefinition.Primary("Okay", DraftDialogResult.Ok),
            },
            _ => new[]
            {
                DraftDialogButtonDefinition.Primary("Okay", DraftDialogResult.Ok),
            },
        };
    }
}
