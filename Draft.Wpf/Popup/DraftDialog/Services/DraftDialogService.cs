using Draft.Dialogs.Models;
using Draft.Dialogs.ViewModels;
using Draft.Dialogs.Views;
using System.Windows;

namespace Draft.Dialogs.Services;

public sealed class DraftDialogService : IDraftDialogService
{
    public DraftDialogResult ShowMessage(DraftMessageDialogRequest request)
    {
        DraftMessageDialogViewModel viewModel = new(request);
        DraftDialogWindow window = new(viewModel);
        Window? owner = GetDialogOwner();

        if (owner is not null)
        {
            window.Owner = owner;
        }
        else
        {
            window.WindowStartupLocation = WindowStartupLocation.CenterScreen;
        }

        window.ShowDialog();
        return viewModel.Result;
    }

    private static Window? GetDialogOwner()
    {
        if (Application.Current?.Windows is null)
            return null;

        return Application.Current.Windows
            .OfType<Window>()
            .FirstOrDefault(window => window.IsActive)
            ?? Application.Current.MainWindow;
    }
}
