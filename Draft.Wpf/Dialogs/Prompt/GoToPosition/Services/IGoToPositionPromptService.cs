using Draft.Dialogs.Prompt.GoToPosition.Models;
using System.Windows;

namespace Draft.Dialogs.Prompt.GoToPosition.Services;

public interface IGoToPositionPromptService
{
    GoToPositionPromptResult Show(GoToPositionPromptRequest request, Window? owner = null);
}
