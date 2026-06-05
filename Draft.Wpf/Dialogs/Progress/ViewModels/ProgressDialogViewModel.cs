using Draft.Dialogs.Progress.Models;

namespace Draft.Dialogs.Progress.ViewModels;

public sealed class ProgressDialogViewModel : BaseViewModel
{
    public ProgressDialogViewModel(ProgressDialogRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        Title = request.Title;
        Description = request.Description;
    }

    public string Title { get; }

    public string Description { get; }
}
