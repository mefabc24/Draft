using System.Windows.Input;

namespace Draft.Dialogs.Models;

public sealed class DraftDialogButtonDefinition
{
    public DraftDialogButtonDefinition(
        string text,
        DraftDialogActionType actionType,
        DraftDialogResult result,
        ICommand? command = null,
        object? commandParameter = null)
    {
        if (string.IsNullOrWhiteSpace(text))
            throw new ArgumentException("Dialog button text cannot be empty.", nameof(text));

        Text = text;
        ActionType = actionType;
        Result = result ?? throw new ArgumentNullException(nameof(result));
        Command = command;
        CommandParameter = commandParameter;
    }

    public string Text { get; }

    public DraftDialogActionType ActionType { get; }

    public DraftDialogResult Result { get; }

    public ICommand? Command { get; }

    public object? CommandParameter { get; }

    public static DraftDialogButtonDefinition Primary(
        string text,
        DraftDialogResult result,
        ICommand? command = null,
        object? commandParameter = null)
    {
        return new DraftDialogButtonDefinition(
            text,
            DraftDialogActionType.Primary,
            result,
            command,
            commandParameter);
    }

    public static DraftDialogButtonDefinition Secondary(
        string text,
        DraftDialogResult result,
        ICommand? command = null,
        object? commandParameter = null)
    {
        return new DraftDialogButtonDefinition(
            text,
            DraftDialogActionType.Secondary,
            result,
            command,
            commandParameter);
    }
}
