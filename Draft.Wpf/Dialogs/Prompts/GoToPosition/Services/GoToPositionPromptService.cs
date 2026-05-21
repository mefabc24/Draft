using Draft.Dialogs.Base.Services;
using Draft.Dialogs.Base.Views;
using Draft.Dialogs.Prompts.GoToPosition.Models;
using Draft.Dialogs.Prompts.GoToPosition.ViewModels;
using Draft.Dialogs.Prompts.GoToPosition.Views;
using System.Windows;

namespace Draft.Dialogs.Prompts.GoToPosition.Services;

public sealed class GoToPositionPromptService : IGoToPositionPromptService
{
    public GoToPositionPromptResult Show(GoToPositionPromptRequest request, Window? owner = null)
    {
        ArgumentNullException.ThrowIfNull(request);

        GoToPositionPromptViewModel viewModel = new(request);
        GoToPositionPromptView view = new()
        {
            DataContext = viewModel,
        };

        BaseDialogWindow window = new(view)
        {
            Title = "Go to Position",
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
