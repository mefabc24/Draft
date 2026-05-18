using Draft.Dialogs.Prompt.RevertSave.Models;
using System.Windows;

namespace Draft.Dialogs.Prompt.RevertSave.Services;

public interface IRevertSavePromptService
{
    RevertSavePromptResult Show(RevertSavePromptRequest request, Window? owner = null);
}
