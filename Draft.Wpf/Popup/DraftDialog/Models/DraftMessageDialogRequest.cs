namespace Draft.Dialogs.Models;

public sealed class DraftMessageDialogRequest
{
    public DraftMessageDialogRequest(
        string title,
        string description,
        DraftDialogType dialogType,
        IEnumerable<DraftDialogButtonDefinition> buttons)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Dialog title cannot be empty.", nameof(title));

        if (string.IsNullOrWhiteSpace(description))
            throw new ArgumentException("Dialog description cannot be empty.", nameof(description));

        Title = title;
        Description = description;
        DialogType = dialogType;
        Buttons = buttons?.ToArray() ?? throw new ArgumentNullException(nameof(buttons));

        if (Buttons.Count == 0)
            throw new ArgumentException("A dialog must define at least one button.", nameof(buttons));
    }

    public string Title { get; }

    public string Description { get; }

    public DraftDialogType DialogType { get; }

    public IReadOnlyList<DraftDialogButtonDefinition> Buttons { get; }
}
