using Draft.Export.Models;

namespace Draft.Export.Services;

public sealed class DocumentExportService
{
    public void Export(DocumentExportRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.FilePath))
            throw new ArgumentException("Export file path is required.", nameof(request));

        // TODO: Implement PDF, HTML, and PNG rendering once the export pipeline exists.
    }
}
