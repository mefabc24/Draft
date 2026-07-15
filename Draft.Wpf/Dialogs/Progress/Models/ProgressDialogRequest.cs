namespace Draft.Dialogs.Progress.Models;

public sealed class ProgressDialogRequest
{
    public ProgressDialogRequest(
        string title,
        string description,
        TimeSpan delay)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Progress dialog title cannot be empty.", nameof(title));

        if (string.IsNullOrWhiteSpace(description))
            throw new ArgumentException("Progress dialog description cannot be empty.", nameof(description));

        Title = title;
        Description = description;
        Delay = delay < TimeSpan.Zero
            ? TimeSpan.Zero
            : delay;
    }

    public string Title { get; }

    public string Description { get; }

    public TimeSpan Delay { get; }
}
