using Draft.Dialogs.Models;

namespace Draft.Dialogs.Services;

public interface IDraftDialogService
{
    DraftDialogResult ShowMessage(DraftMessageDialogRequest request);
}
