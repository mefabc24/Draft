using Draft.Export.Models;
using Draft.WebWorkspace.Services;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;

namespace Draft.Export.Services;

public sealed class PdfExportService
{
    private const double PdfPageWidthInches = 8.5;
    private const double PdfPageHeightInches = 11;
    private const int PdfLayoutTimeoutMilliseconds = 10000;
    private const int PdfLayoutPollDelayMilliseconds = 50;
    private readonly WebWorkspacePathResolver _pathResolver;

    public PdfExportService()
        : this(new WebWorkspacePathResolver())
    {
    }

    public PdfExportService(WebWorkspacePathResolver pathResolver)
    {
        _pathResolver = pathResolver;
    }

    public async Task ExportAsync(
        WebView2 webView,
        string hostName,
        DocumentExportRequest request)
    {
        ArgumentNullException.ThrowIfNull(webView);
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.FilePath))
            throw new ArgumentException("Export file path is required.", nameof(request));

        if (string.IsNullOrWhiteSpace(request.HtmlDocument))
            throw new ArgumentException("Export HTML is required.", nameof(request));

        await webView.EnsureCoreWebView2Async();

        webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
            hostName,
            _pathResolver.GetWebRootPath(),
            CoreWebView2HostResourceAccessKind.Allow);

        await ExportWebViewNavigator.NavigateToExportHtmlAsync(webView, request.HtmlDocument);
        await PreparePdfExportLayoutAsync(webView);

        CoreWebView2PrintSettings printSettings = webView.CoreWebView2.Environment.CreatePrintSettings();
        printSettings.Orientation = CoreWebView2PrintOrientation.Portrait;
        printSettings.PageWidth = PdfPageWidthInches;
        printSettings.PageHeight = PdfPageHeightInches;
        printSettings.ScaleFactor = 1;
        printSettings.ShouldPrintBackgrounds = true;
        printSettings.ShouldPrintHeaderAndFooter = false;
        printSettings.MarginTop = 0;
        printSettings.MarginRight = 0;
        printSettings.MarginBottom = 0;
        printSettings.MarginLeft = 0;

        bool didPrint = await webView.CoreWebView2.PrintToPdfAsync(request.FilePath, printSettings);
        if (!didPrint)
            throw new InvalidOperationException("The PDF export could not be completed.");
    }

    private static async Task PreparePdfExportLayoutAsync(WebView2 webView)
    {
        try
        {
            string hasLayoutPreparation = await webView.CoreWebView2.ExecuteScriptAsync(
                "Boolean(window.draftPreparePdfExport)");

            if (!string.Equals(hasLayoutPreparation, "true", StringComparison.OrdinalIgnoreCase))
                return;

            await webView.CoreWebView2.ExecuteScriptAsync("window.draftPreparePdfExport()");

            using CancellationTokenSource timeout = new(PdfLayoutTimeoutMilliseconds);

            while (!timeout.IsCancellationRequested)
            {
                string isReady = await webView.CoreWebView2.ExecuteScriptAsync("Boolean(window.draftPdfExportReady)");

                if (string.Equals(isReady, "true", StringComparison.OrdinalIgnoreCase))
                    return;

                try
                {
                    await Task.Delay(PdfLayoutPollDelayMilliseconds, timeout.Token);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }
        catch
        {
            // Pagination is an export layout enhancement. If it cannot run, keep PDF export usable.
        }
    }
}
