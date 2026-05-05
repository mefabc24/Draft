namespace Draft.Dialogs.Models;

public sealed record DraftDialogResult(string Id)
{
    public static DraftDialogResult None { get; } = new("none");

    public static DraftDialogResult Ok { get; } = new("ok");

    public static DraftDialogResult Cancel { get; } = new("cancel");

    public static DraftDialogResult Close { get; } = new("close");
}
