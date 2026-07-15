using Draft.Export.Models;
using Microsoft.Web.WebView2.Wpf;

namespace Draft.Export.Services;

public sealed class DocumentExportService
{
    private readonly HtmlExportService _htmlExportService;
    private readonly PdfExportService _pdfExportService;
    private readonly PngExportService _pngExportService;

    public DocumentExportService()
        : this(new HtmlExportService(), new PdfExportService(), new PngExportService())
    {
    }

    public DocumentExportService(
        HtmlExportService htmlExportService,
        PdfExportService pdfExportService)
        : this(htmlExportService, pdfExportService, new PngExportService())
    {
    }

    public DocumentExportService(
        HtmlExportService htmlExportService,
        PdfExportService pdfExportService,
        PngExportService pngExportService)
    {
        _htmlExportService = htmlExportService;
        _pdfExportService = pdfExportService;
        _pngExportService = pngExportService;
    }

    public Task ExportAsync(
        DocumentExportRequest request,
        WebView2? exportWebView = null,
        string? webHostName = null)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.FilePath))
            throw new ArgumentException("Export file path is required.", nameof(request));

        return request.Format switch
        {
            ExportFormat.Html => _htmlExportService.ExportAsync(request),
            ExportFormat.Pdf => ExportPdfAsync(request, exportWebView, webHostName),
            ExportFormat.Png => ExportPngAsync(request, exportWebView, webHostName),
            _ => throw new NotSupportedException(LocalizationService.Translate(
                "export.unsupportedFormat",
                "The selected export format is not supported.")),
        };
    }

    private Task ExportPdfAsync(
        DocumentExportRequest request,
        WebView2? pdfExportWebView,
        string? webHostName)
    {
        if (pdfExportWebView is null)
            throw new InvalidOperationException(LocalizationService.Translate(
                "export.pdfWebViewRequired",
                "A PDF export WebView is required."));

        if (string.IsNullOrWhiteSpace(webHostName))
            throw new InvalidOperationException(LocalizationService.Translate(
                "export.webViewHostNameRequired",
                "A WebView host name is required."));

        return _pdfExportService.ExportAsync(pdfExportWebView, webHostName, request);
    }

    private Task ExportPngAsync(
        DocumentExportRequest request,
        WebView2? pngExportWebView,
        string? webHostName)
    {
        if (pngExportWebView is null)
            throw new InvalidOperationException(LocalizationService.Translate(
                "export.pngWebViewRequired",
                "A PNG export WebView is required."));

        if (string.IsNullOrWhiteSpace(webHostName))
            throw new InvalidOperationException(LocalizationService.Translate(
                "export.webViewHostNameRequired",
                "A WebView host name is required."));

        return _pngExportService.ExportAsync(pngExportWebView, webHostName, request);
    }
}
