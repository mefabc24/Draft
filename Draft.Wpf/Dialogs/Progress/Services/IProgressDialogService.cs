using Draft.Dialogs.Progress.Models;
using System.Windows;

namespace Draft.Dialogs.Progress.Services;

public interface IProgressDialogService
{
    IDisposable ShowDelayed(ProgressDialogRequest request, Window? owner = null);
}
