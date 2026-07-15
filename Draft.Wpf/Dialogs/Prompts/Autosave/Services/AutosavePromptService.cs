using Draft.Dialogs.Base.Services;
using Draft.Dialogs.Base.Views;
using Draft.Dialogs.Prompts.Autosave.Models;
using Draft.Dialogs.Prompts.Autosave.ViewModels;
using Draft.Dialogs.Prompts.Autosave.Views;
using System.Windows;

namespace Draft.Dialogs.Prompts.Autosave.Services;

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
            Title = LocalizationService.Translate("autosave.windowTitle", "Autosave"),
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
            DialogWindowService.ShowDialog(window, owner);
            return viewModel.Result;
        }
        finally
        {
            viewModel.CloseRequested -= CloseRequested;
        }
    }
}
