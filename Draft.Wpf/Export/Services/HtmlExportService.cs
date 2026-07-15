using Draft.Export.Models;
using System.IO;
using System.Text;

namespace Draft.Export.Services;

public sealed class HtmlExportService
{
    public Task ExportAsync(DocumentExportRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.FilePath))
            throw new ArgumentException("Export file path is required.", nameof(request));

        if (string.IsNullOrWhiteSpace(request.HtmlDocument))
            throw new ArgumentException("Export HTML is required.", nameof(request));

        return File.WriteAllTextAsync(request.FilePath, request.HtmlDocument, Encoding.UTF8);
    }
}
