using Draft.Export.Models;
using Draft.WebWorkspace.Services;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;

namespace Draft.Export.Services;

public sealed class PdfExportService
{
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

        await NavigateToExportHtmlAsync(webView, request.HtmlDocument);

        CoreWebView2PrintSettings printSettings = webView.CoreWebView2.Environment.CreatePrintSettings();
        printSettings.Orientation = CoreWebView2PrintOrientation.Portrait;
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

    private static Task NavigateToExportHtmlAsync(WebView2 webView, string htmlDocument)
    {
        TaskCompletionSource<bool> navigationCompleted = new();

        void NavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs e)
        {
            webView.NavigationCompleted -= NavigationCompleted;

            if (e.IsSuccess)
            {
                navigationCompleted.TrySetResult(true);
                return;
            }

            navigationCompleted.TrySetException(
                new InvalidOperationException($"The export preview could not be loaded: {e.WebErrorStatus}."));
        }

        webView.NavigationCompleted += NavigationCompleted;
        webView.NavigateToString(htmlDocument);

        return navigationCompleted.Task;
    }
}
