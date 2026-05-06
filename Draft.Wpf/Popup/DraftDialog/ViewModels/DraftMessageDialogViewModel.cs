using Draft.Dialogs.Models;
using Draft.Helpers;
using System.Collections.ObjectModel;

namespace Draft.Dialogs.ViewModels;

public sealed class DraftMessageDialogViewModel : BaseViewModel
{
    private DraftDialogResult _result = DraftDialogResult.None;

    public DraftMessageDialogViewModel(DraftMessageDialogRequest request)
    {
        Title = request.Title;
        Description = request.Description;
        DialogType = request.DialogType;
        Buttons = new ObservableCollection<DraftDialogButtonViewModel>(
            request.Buttons.Select(button => new DraftDialogButtonViewModel(button, HandleButtonClicked)));
    }

    public string Title { get; }

    public string Description { get; }

    public DraftDialogType DialogType { get; }

    public ObservableCollection<DraftDialogButtonViewModel> Buttons { get; }

    public DraftDialogResult Result
    {
        get => _result;
        private set => SetProperty(ref _result, value);
    }

    public event EventHandler? CloseRequested;

    private void HandleButtonClicked(DraftDialogButtonViewModel button)
    {
        Result = button.Result;
        CloseRequested?.Invoke(this, EventArgs.Empty);
    }
}
