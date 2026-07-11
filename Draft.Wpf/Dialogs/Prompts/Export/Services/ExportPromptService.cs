using Draft.Dialogs.Base.Services;
using Draft.Dialogs.Base.Views;
using Draft.Dialogs.Prompts.Export.Models;
using Draft.Dialogs.Prompts.Export.ViewModels;
using Draft.Dialogs.Prompts.Export.Views;
using System.Windows;

namespace Draft.Dialogs.Prompts.Export.Services;

public sealed class ExportPromptService : IExportPromptService
{
    public ExportPromptResult Show(ExportPromptRequest request, Window? owner = null)
    {
        ArgumentNullException.ThrowIfNull(request);

        ExportPromptViewModel viewModel = new(request);
        ExportPromptView view = new()
        {
            DataContext = viewModel,
        };

        BaseDialogWindow window = new(view)
        {
            Title = LocalizationService.Translate("export.messageTitle", "Export"),
            Focusable = true,
        };

        void CloseRequested(object? sender, EventArgs e)
        {
            if (viewModel.Result.IsConfirmed)
            {
                window.DialogResult = true;
                return;
            }

            window.Close();
        }

        viewModel.CloseRequested += CloseRequested;

        try
        {
            DialogWindowService.ShowDialog(window, owner);
            return viewModel.Result;
        }
        finally
        {
            viewModel.CloseRequested -= CloseRequested;
        }
    }
}
