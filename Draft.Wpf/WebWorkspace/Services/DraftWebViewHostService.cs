using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;

namespace Draft.WebWorkspace.Services;

public sealed class DraftWebViewHostService
{
    private readonly WebWorkspacePathResolver _pathResolver;

    public DraftWebViewHostService()
        : this(new WebWorkspacePathResolver())
    {
    }

    public DraftWebViewHostService(WebWorkspacePathResolver pathResolver)
    {
        _pathResolver = pathResolver;
    }

    public async Task InitializeAsync(
        WebView2 webView,
        string hostName,
        EventHandler<CoreWebView2WebMessageReceivedEventArgs> webMessageReceived,
        EventHandler<CoreWebView2NavigationStartingEventArgs> navigationStarting,
        EventHandler<CoreWebView2NewWindowRequestedEventArgs> newWindowRequested,
        EventHandler<CoreWebView2NavigationCompletedEventArgs> navigationCompleted)
    {
        string webRootPath = _pathResolver.GetWebRootPath();

        await webView.EnsureCoreWebView2Async();

        webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
        webView.CoreWebView2.Settings.IsZoomControlEnabled = false;
        webView.ZoomFactor = 1.0;
        webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
            hostName,
            webRootPath,
            CoreWebView2HostResourceAccessKind.Allow);
        webView.CoreWebView2.WebMessageReceived += webMessageReceived;
        webView.CoreWebView2.NavigationStarting += navigationStarting;
        webView.CoreWebView2.NewWindowRequested += newWindowRequested;
        webView.NavigationCompleted += navigationCompleted;

        webView.Source = new Uri($"https://{hostName}/index.html");
    }
}
