using Draft.Dialogs.Base.Services;
using Draft.Dialogs.Base.Views;
using Draft.Dialogs.Prompts.RevertSave.Models;
using Draft.Dialogs.Prompts.RevertSave.ViewModels;
using Draft.Dialogs.Prompts.RevertSave.Views;
using System.Windows;

namespace Draft.Dialogs.Prompts.RevertSave.Services;

public sealed class RevertSavePromptService : IRevertSavePromptService
{
    private readonly RevertSaveOptionFormatter _optionFormatter;
    private readonly RevertSaveOptionProvider _optionProvider;

    public RevertSavePromptService()
        : this(new RevertSaveOptionProvider(), new RevertSaveOptionFormatter())
    {
    }

    public RevertSavePromptService(
        RevertSaveOptionProvider optionProvider,
        RevertSaveOptionFormatter optionFormatter)
    {
        _optionProvider = optionProvider;
        _optionFormatter = optionFormatter;
    }

    public RevertSavePromptResult Show(RevertSavePromptRequest request, Window? owner = null)
    {
        ArgumentNullException.ThrowIfNull(request);

        RevertSaveViewModel viewModel = new(
            request,
            _optionProvider,
            _optionFormatter);
        RevertSaveView view = new()
        {
            DataContext = viewModel,
        };

        BaseDialogWindow window = new(view)
        {
            Title = LocalizationService.Translate("revertSave.messageTitle", "Revert Save"),
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
