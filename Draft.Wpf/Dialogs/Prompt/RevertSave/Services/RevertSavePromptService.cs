using Draft.Dialogs.Base.Views;
using Draft.Dialogs.Prompt.RevertSave.Models;
using Draft.Dialogs.Prompt.RevertSave.ViewModels;
using Draft.Dialogs.Prompt.RevertSave.Views;
using Draft.Services.Save;
using System.Windows;

namespace Draft.Dialogs.Prompt.RevertSave.Services;

public sealed class RevertSavePromptService : IRevertSavePromptService
{
    private readonly ManualSaveSnapshotService _manualSaveSnapshotService;
    private readonly AutosaveSnapshotService _autosaveSnapshotService;

    public RevertSavePromptService()
        : this(new ManualSaveSnapshotService(), new AutosaveSnapshotService())
    {
    }

    public RevertSavePromptService(
        ManualSaveSnapshotService manualSaveSnapshotService,
        AutosaveSnapshotService autosaveSnapshotService)
    {
        _manualSaveSnapshotService = manualSaveSnapshotService;
        _autosaveSnapshotService = autosaveSnapshotService;
    }

    public RevertSavePromptResult Show(RevertSavePromptRequest request, Window? owner = null)
    {
        ArgumentNullException.ThrowIfNull(request);

        RevertSaveViewModel viewModel = new(
            request,
            _manualSaveSnapshotService,
            _autosaveSnapshotService);
        RevertSaveView view = new()
        {
            DataContext = viewModel,
        };

        BaseDialogWindow window = new(view)
        {
            Title = "Revert Save",
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
            Window? resolvedOwner = owner ?? GetPromptOwner();
            if (resolvedOwner is not null)
            {
                window.Owner = resolvedOwner;
            }
            else
            {
                window.WindowStartupLocation = WindowStartupLocation.CenterScreen;
            }

            window.ShowDialog();
            return viewModel.Result;
        }
        finally
        {
            viewModel.CloseRequested -= CloseRequested;
        }
    }

    private static Window? GetPromptOwner()
    {
        if (Application.Current?.Windows is null)
            return null;

        return Application.Current.Windows
            .OfType<Window>()
            .FirstOrDefault(window => window.IsActive && window.IsVisible)
            ?? Application.Current.MainWindow;
    }
}
