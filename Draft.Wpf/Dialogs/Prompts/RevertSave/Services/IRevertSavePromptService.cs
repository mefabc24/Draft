using Draft.Dialogs.Prompts.RevertSave.Models;
using System.Windows;

namespace Draft.Dialogs.Prompts.RevertSave.Services;

public interface IRevertSavePromptService
{
    RevertSavePromptResult Show(RevertSavePromptRequest request, Window? owner = null);
}
