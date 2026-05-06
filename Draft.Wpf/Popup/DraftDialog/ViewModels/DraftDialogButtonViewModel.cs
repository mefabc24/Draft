using Draft.Dialogs.Models;
using Draft.Helpers;
using System.Windows.Input;

namespace Draft.Dialogs.ViewModels;

public sealed class DraftDialogButtonViewModel
{
    private readonly ICommand? _command;
    private readonly object? _commandParameter;
    private readonly Action<DraftDialogButtonViewModel> _onClicked;

    public DraftDialogButtonViewModel(
        DraftDialogButtonDefinition definition,
        Action<DraftDialogButtonViewModel> onClicked)
    {
        Text = definition.Text;
        ActionType = definition.ActionType;
        Result = definition.Result;
        _command = definition.Command;
        _commandParameter = definition.CommandParameter;
        _onClicked = onClicked ?? throw new ArgumentNullException(nameof(onClicked));
        ClickCommand = new RelayCommand(ExecuteClick, CanExecuteClick);
    }

    public string Text { get; }

    public DraftDialogActionType ActionType { get; }

    public DraftDialogResult Result { get; }

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
