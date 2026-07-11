using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;

namespace Draft.Export.Services;

internal static class ExportWebViewNavigator
{
    public static Task NavigateToExportHtmlAsync(WebView2 webView, string htmlDocument)
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
                new InvalidOperationException(LocalizationService.TranslateFormat(
                    "export.previewLoadFailed",
                    "The export preview could not be loaded: {status}.",
                    new Dictionary<string, string>(StringComparer.Ordinal)
                    {
                        ["status"] = e.WebErrorStatus.ToString(),
                    })));
        }

        webView.NavigationCompleted += NavigationCompleted;
        webView.NavigateToString(htmlDocument);

        return navigationCompleted.Task;
    }
}
