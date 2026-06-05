using Draft.Dialogs.Prompts.Export.Models;
using System.Windows;

namespace Draft.Dialogs.Prompts.Export.Services;

public interface IExportPromptService
{
    ExportPromptResult Show(ExportPromptRequest request, Window? owner = null);
}
