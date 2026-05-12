using Draft.Dialogs.Message.Models;

namespace Draft.Dialogs.Message.Services;

public interface IMessageDialogService
{
    MessageDialogResult ShowMessage(MessageDialogRequest request);
}
