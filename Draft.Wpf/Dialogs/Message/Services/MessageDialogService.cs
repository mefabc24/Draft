using Draft.Dialogs.Base.Views;
using Draft.Dialogs.Message.Models;
using Draft.Dialogs.Message.ViewModels;
using Draft.Dialogs.Message.Views;
using System.Windows;

namespace Draft.Dialogs.Message.Services;

public sealed class MessageDialogService : IMessageDialogService
{
    public MessageDialogResult ShowMessage(MessageDialogRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        MessageDialogViewModel viewModel = new(request);
        MessageDialogView view = new()
        {
            DataContext = viewModel,
        };

        BaseDialogWindow window = new(view)
        {
            Title = request.Title,
        };

        void CloseRequested(object? sender, EventArgs e)
        {
            window.DialogResult = true;
            window.Close();
        }

        viewModel.CloseRequested += CloseRequested;

        try
        {
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
        finally
        {
            viewModel.CloseRequested -= CloseRequested;
        }
    }

    private static Window? GetDialogOwner()
    {
        if (Application.Current?.Windows is null)
            return null;

        return Application.Current.Windows
            .OfType<Window>()
            .FirstOrDefault(window => window.IsActive && window.IsVisible)
            ?? Application.Current.MainWindow;
    }
}
