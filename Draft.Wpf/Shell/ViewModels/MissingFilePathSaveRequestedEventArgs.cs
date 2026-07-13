namespace Draft.Shell.ViewModels;

public sealed class MissingFilePathSaveRequestedEventArgs : EventArgs
{
    public MissingFilePathSaveRequestedEventArgs(string filePath)
    {
        FilePath = filePath;
    }

    public string FilePath { get; }
}
