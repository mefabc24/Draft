using System.Windows.Input;

namespace Draft.Dialogs.Message.Models;

public sealed class MessageDialogButtonDefinition
{
    public MessageDialogButtonDefinition(
        string text,
        MessageDialogActionType actionType,
        MessageDialogResult result,
        ICommand? command = null,
        object? commandParameter = null)
    {
        if (string.IsNullOrWhiteSpace(text))
            throw new ArgumentException("Dialog button text cannot be empty.", nameof(text));

        Text = text.Trim();
        ActionType = actionType;
        Result = result ?? throw new ArgumentNullException(nameof(result));
        Command = command;
        CommandParameter = commandParameter;
    }

    public string Text { get; }

    public MessageDialogActionType ActionType { get; }

    public MessageDialogResult Result { get; }

    public ICommand? Command { get; }

    public object? CommandParameter { get; }

    public static MessageDialogButtonDefinition Primary(
        string text,
        MessageDialogResult result,
        ICommand? command = null,
        object? commandParameter = null)
    {
        return new MessageDialogButtonDefinition(
            text,
            MessageDialogActionType.Primary,
            result,
            command,
            commandParameter);
    }

    public static MessageDialogButtonDefinition Secondary(
        string text,
        MessageDialogResult result,
        ICommand? command = null,
        object? commandParameter = null)
    {
        return new MessageDialogButtonDefinition(
            text,
            MessageDialogActionType.Secondary,
            result,
            command,
            commandParameter);
    }
}
