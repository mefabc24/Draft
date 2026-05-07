using Draft.Dialogs.Models;
using Draft.Dialogs.Services;
using Draft.Helpers;
using Draft.Popup.DraftPrompt.Views;
using System.Windows;
using System.Windows.Controls;
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
        DraftPromptWindow window = new();
        window.Title = "Rename File";
        window.PromptContent = CreatePromptPreviewContent(window);
        window.PromptActions = CreatePromptPreviewActions(window);

        Window? owner = Application.Current.Windows
            .OfType<Window>()
            .FirstOrDefault(activeWindow => activeWindow.IsActive)
            ?? Application.Current.MainWindow;

        if (owner is not null)
        {
            window.Owner = owner;
        }
        else
        {
            window.WindowStartupLocation = WindowStartupLocation.CenterScreen;
        }

        window.ShowDialog();
    }

    private static object CreatePromptPreviewContent(DraftPromptWindow window)
    {
        StackPanel content = new()
        {
            HorizontalAlignment = HorizontalAlignment.Stretch,
            Orientation = Orientation.Vertical,
        };

        content.Children.Add(new TextBlock
        {
            Margin = new Thickness(0, 0, 0, 12),
            FontFamily = (System.Windows.Media.FontFamily)Application.Current.FindResource("Font.Manrope"),
            FontSize = 16,
            Foreground = (System.Windows.Media.Brush)Application.Current.FindResource("Brush.Text.Secondary"),
            Text = "Enter a new name for the document",
        });

        content.Children.Add(new TextBox
        {
            Height = 36,
            HorizontalAlignment = HorizontalAlignment.Stretch,
            Style = (Style)window.FindResource("SettingsTextBox"),
            Text = "current-document.md",
        });

        return content;
    }

    private static IReadOnlyList<UIElement> CreatePromptPreviewActions(DraftPromptWindow window)
    {
        Button cancelButton = new()
        {
            Margin = new Thickness(0, 0, 8, 0),
            Content = "Cancel",
            Padding = new Thickness(24, 0, 24, 0),
            Style = (Style)window.FindResource("DraftPromptSecondaryButton"),
        };
        cancelButton.Click += (_, _) => window.Close();

        Button confirmButton = new()
        {
            Content = "Rename",
            Padding = new Thickness(24, 0, 24, 0),
            Style = (Style)window.FindResource("SettingsPrimaryButton"),
        };
        confirmButton.Click += (_, _) =>
        {
            window.DialogResult = true;
            window.Close();
        };

        return new UIElement[]
        {
            cancelButton,
            confirmButton,
        };
    }

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
