using System.IO;
using System.Security;

namespace Draft.Documents.Services;

public sealed class DocumentFileService
{
    public DocumentState LoadDocumentFromPath(string path)
    {
        string content = File.ReadAllText(path);
        string fullPath = Path.GetFullPath(path);

        return new DocumentState(
            content,
            fullPath,
            GetFileTimestampUtc(fullPath));
    }

    public async Task<string> WriteDocumentAsync(
        string path,
        string content,
        CancellationToken cancellationToken = default)
    {
        await File.WriteAllTextAsync(path, content, cancellationToken);
        return Path.GetFullPath(path);
    }

    public DateTimeOffset GetFileTimestampUtc(string path)
    {
        try
        {
            return new DateTimeOffset(File.GetLastWriteTimeUtc(path), TimeSpan.Zero);
        }
        catch (Exception ex) when (IsFileOperationException(ex))
        {
            return DateTimeOffset.UtcNow;
        }
    }

    private static bool IsFileOperationException(Exception ex)
    {
        return ex is IOException
            or UnauthorizedAccessException
            or ArgumentException
            or NotSupportedException
            or PathTooLongException
            or SecurityException
            or InvalidOperationException;
    }
}
