using Draft.Dialogs.Base.Views;
using Draft.Dialogs.Prompt.AutosavePrompt.Models;
using Draft.Dialogs.Prompt.AutosavePrompt.ViewModels;
using Draft.Dialogs.Prompt.AutosavePrompt.Views;
using System.Windows;

namespace Draft.Dialogs.Prompt.AutosavePrompt.Services;

public sealed class AutosavePromptService : IAutosavePromptService
{
    public AutosavePromptResult Show(AutosavePromptRequest request, Window? owner = null)
    {
        ArgumentNullException.ThrowIfNull(request);

        AutosavePromptViewModel viewModel = new(request);
        AutosavePromptView view = new()
        {
            DataContext = viewModel,
        };

        BaseDialogWindow window = new(view)
        {
            Title = "Autosave",
            Focusable = true,
        };

        void CloseRequested(object? sender, EventArgs e)
        {
            if (viewModel.Result.IsConfirmed)
            {
                window.DialogResult = true;
                return;
            }

            window.Close();
        }

        viewModel.CloseRequested += CloseRequested;

        try
        {
            Window? resolvedOwner = owner ?? GetPromptOwner();
            if (resolvedOwner is not null)
            {
                window.Owner = resolvedOwner;
            }
            else
            {
                window.WindowStartupLocation = WindowStartupLocation.CenterScreen;
            }

            window.ShowDialog();
            return viewModel.Result;
        }
        finally
        {
            viewModel.CloseRequested -= CloseRequested;
        }
    }

    private static Window? GetPromptOwner()
    {
        if (Application.Current?.Windows is null)
            return null;

        return Application.Current.Windows
            .OfType<Window>()
            .FirstOrDefault(window => window.IsActive && window.IsVisible)
            ?? Application.Current.MainWindow;
    }
}
