using Draft.Dialogs.Message.Models;
using System.Windows.Input;

namespace Draft.Dialogs.Message.ViewModels;

public sealed class MessageDialogViewModel : BaseViewModel
{
    private MessageDialogResult _result = MessageDialogResult.None;

    public MessageDialogViewModel(MessageDialogRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        Title = request.Title;
        Description = request.Description;
        DialogType = request.DialogType;
        CancelCommand = new RelayCommand(Cancel);
        Buttons = request.Buttons
            .Select(button => new MessageDialogButtonViewModel(button, HandleButtonClicked))
            .ToArray();
    }

    public string Title { get; }

    public string Description { get; }

    public MessageDialogType DialogType { get; }

    public IReadOnlyList<MessageDialogButtonViewModel> Buttons { get; }

    public ICommand CancelCommand { get; }

    public MessageDialogResult Result
    {
        get => _result;
        private set => SetProperty(ref _result, value);
    }

    public event EventHandler? CloseRequested;

    private void HandleButtonClicked(MessageDialogButtonViewModel button)
    {
        Result = button.Result;
        CloseRequested?.Invoke(this, EventArgs.Empty);
    }

    private void Cancel()
    {
        Result = MessageDialogResult.Cancel;
        CloseRequested?.Invoke(this, EventArgs.Empty);
    }
}
