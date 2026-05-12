using Draft.Dialogs.Base.Views;
using Draft.Dialogs.Prompt.GoToPosition.Models;
using Draft.Dialogs.Prompt.GoToPosition.ViewModels;
using Draft.Dialogs.Prompt.GoToPosition.Views;
using System.Windows;

namespace Draft.Dialogs.Prompt.GoToPosition.Services;

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
