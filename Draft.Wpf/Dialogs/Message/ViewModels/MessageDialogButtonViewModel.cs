using Draft.Dialogs.Message.Models;
using System.Windows.Input;

namespace Draft.Dialogs.Message.ViewModels;

public sealed class MessageDialogButtonViewModel
{
    private readonly ICommand? _command;
    private readonly object? _commandParameter;
    private readonly Action<MessageDialogButtonViewModel> _onClicked;

    public MessageDialogButtonViewModel(
        MessageDialogButtonDefinition definition,
        Action<MessageDialogButtonViewModel> onClicked)
    {
        ArgumentNullException.ThrowIfNull(definition);

        Text = definition.Text;
        ActionType = definition.ActionType;
        Result = definition.Result;
        _command = definition.Command;
        _commandParameter = definition.CommandParameter;
        _onClicked = onClicked ?? throw new ArgumentNullException(nameof(onClicked));
        ClickCommand = new RelayCommand(ExecuteClick, CanExecuteClick);
    }

    public string Text { get; }

    public MessageDialogActionType ActionType { get; }

    public MessageDialogResult Result { get; }

    public bool IsPrimary => ActionType == MessageDialogActionType.Primary;

    public bool IsSecondary => ActionType == MessageDialogActionType.Secondary;

    public ICommand ClickCommand { get; }

    private bool CanExecuteClick()
    {
        return _command?.CanExecute(_commandParameter) ?? true;
    }

    private void ExecuteClick()
    {
        if (_command is not null)
        {
            _command.Execute(_commandParameter);
        }

        _onClicked(this);
    }
}
