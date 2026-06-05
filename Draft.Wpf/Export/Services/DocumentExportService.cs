using Draft.Export.Models;
using Microsoft.Web.WebView2.Wpf;

namespace Draft.Export.Services;

public sealed class DocumentExportService
{
    private readonly HtmlExportService _htmlExportService;
    private readonly PdfExportService _pdfExportService;

    public DocumentExportService()
        : this(new HtmlExportService(), new PdfExportService())
    {
    }

    public DocumentExportService(
        HtmlExportService htmlExportService,
        PdfExportService pdfExportService)
    {
        _htmlExportService = htmlExportService;
        _pdfExportService = pdfExportService;
    }

    public Task ExportAsync(
        DocumentExportRequest request,
        WebView2? pdfExportWebView = null,
        string? webHostName = null)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.FilePath))
            throw new ArgumentException("Export file path is required.", nameof(request));

        return request.Format switch
        {
            ExportFormat.Html => _htmlExportService.ExportAsync(request),
            ExportFormat.Pdf => ExportPdfAsync(request, pdfExportWebView, webHostName),
            ExportFormat.Png => throw new NotSupportedException("PNG export is not implemented yet."),
            _ => throw new NotSupportedException("The selected export format is not supported."),
        };
    }

    private Task ExportPdfAsync(
        DocumentExportRequest request,
        WebView2? pdfExportWebView,
        string? webHostName)
    {
        if (pdfExportWebView is null)
            throw new InvalidOperationException("A PDF export WebView is required.");

        if (string.IsNullOrWhiteSpace(webHostName))
            throw new InvalidOperationException("A WebView host name is required.");

        return _pdfExportService.ExportAsync(pdfExportWebView, webHostName, request);
    }
}
