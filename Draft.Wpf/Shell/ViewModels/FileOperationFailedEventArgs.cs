namespace Draft.Shell.ViewModels;

public sealed class FileOperationFailedEventArgs : EventArgs
{
    public FileOperationFailedEventArgs(string title, string message)
    {
        Title = title;
        Message = message;
    }

    public string Title { get; }

    public string Message { get; }
}
