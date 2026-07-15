namespace Draft.Dialogs.Message.Models;

public sealed class MessageDialogRequest
{
    public const double DefaultWidth = 460;
    public const double DefaultTextMaxWidth = 400;

    public MessageDialogRequest(
        string title,
        string description,
        MessageDialogType dialogType,
        IEnumerable<MessageDialogButtonDefinition> buttons,
        double width = DefaultWidth,
        double textMaxWidth = DefaultTextMaxWidth)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Dialog title cannot be empty.", nameof(title));

        if (string.IsNullOrWhiteSpace(description))
            throw new ArgumentException("Dialog description cannot be empty.", nameof(description));

        if (width <= 0)
            throw new ArgumentOutOfRangeException(nameof(width), "Dialog width must be greater than zero.");

        if (textMaxWidth <= 0)
            throw new ArgumentOutOfRangeException(nameof(textMaxWidth), "Dialog text width must be greater than zero.");

        Title = title;
        Description = description;
        DialogType = dialogType;
        Width = width;
        TextMaxWidth = Math.Min(textMaxWidth, width);
        Buttons = buttons?.ToArray() ?? throw new ArgumentNullException(nameof(buttons));

        if (Buttons.Count == 0)
            throw new ArgumentException("A dialog must define at least one button.", nameof(buttons));

        if (Buttons.Any(button => button is null))
            throw new ArgumentException("Dialog buttons cannot contain null entries.", nameof(buttons));
    }

    public string Title { get; }

    public string Description { get; }

    public MessageDialogType DialogType { get; }

    public double Width { get; }

    public double TextMaxWidth { get; }

    public IReadOnlyList<MessageDialogButtonDefinition> Buttons { get; }
}
