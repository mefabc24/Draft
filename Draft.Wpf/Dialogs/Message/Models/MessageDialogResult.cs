namespace Draft.Dialogs.Message.Models;

public sealed record MessageDialogResult(string Id)
{
    public static MessageDialogResult None { get; } = new("none");

    public static MessageDialogResult Ok { get; } = new("ok");

    public static MessageDialogResult Cancel { get; } = new("cancel");

    public static MessageDialogResult Close { get; } = new("close");
}
