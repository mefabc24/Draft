using Draft.Dialogs.Prompt.AutosavePrompt.Models;
using System.Windows;

namespace Draft.Dialogs.Prompt.AutosavePrompt.Services;

public interface IAutosavePromptService
{
    AutosavePromptResult Show(AutosavePromptRequest request, Window? owner = null);
}
