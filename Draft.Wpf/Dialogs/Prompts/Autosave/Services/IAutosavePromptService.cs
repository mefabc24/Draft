using Draft.Dialogs.Prompts.Autosave.Models;
using System.Windows;

namespace Draft.Dialogs.Prompts.Autosave.Services;

public interface IAutosavePromptService
{
    AutosavePromptResult Show(AutosavePromptRequest request, Window? owner = null);
}
