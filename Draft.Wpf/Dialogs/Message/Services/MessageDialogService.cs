using Draft.Dialogs.Base.Services;
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
            DialogWindowService.ShowDialog(window);
            return viewModel.Result;
        }
        finally
        {
            viewModel.CloseRequested -= CloseRequested;
        }
    }
}
