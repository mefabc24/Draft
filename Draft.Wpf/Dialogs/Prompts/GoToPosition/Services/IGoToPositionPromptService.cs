using Draft.Dialogs.Prompts.GoToPosition.Models;
using System.Windows;

namespace Draft.Dialogs.Prompts.GoToPosition.Services;

public interface IGoToPositionPromptService
{
    GoToPositionPromptResult Show(GoToPositionPromptRequest request, Window? owner = null);
}
