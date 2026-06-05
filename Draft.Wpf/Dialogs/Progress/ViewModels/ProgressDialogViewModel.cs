using Draft.Dialogs.Progress.Models;
using System.Windows.Input;

namespace Draft.Dialogs.Progress.ViewModels;

public sealed class ProgressDialogViewModel : BaseViewModel
{
    public ProgressDialogViewModel(ProgressDialogRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        Title = request.Title;
        Description = request.Description;
        CloseCommand = new RelayCommand(Close);
    }

    public string Title { get; }

    public string Description { get; }

    public ICommand CloseCommand { get; }

    public event EventHandler? CloseRequested;

    private void Close()
    {
        CloseRequested?.Invoke(this, EventArgs.Empty);
    }
}
