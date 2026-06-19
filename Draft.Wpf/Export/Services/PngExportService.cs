using Draft.Export.Models;
using Draft.WebWorkspace.Services;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;
using System.Globalization;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;

namespace Draft.Export.Services;

public sealed class PngExportService
{
    private const double InitialViewportWidthCssPixels = 1016;
    private const double InitialViewportHeightCssPixels = 1024;
    private const double MinimumViewportWidthCssPixels = 320;
    private const double MaximumViewportWidthCssPixels = 4096;
    private const double CaptureTileHeightCssPixels = 4096;
    private const int RenderTimeoutMilliseconds = 15000;
    private const int FrameTimeoutMilliseconds = 1000;
    private const int PollDelayMilliseconds = 50;
    private const long MaximumPngPixelCount = 100_000_000;
    private const string ReadyFlag = "draftPngExportReady";
    private const string ErrorFlag = "draftPngExportError";
    private const string FrameReadyFlag = "draftPngExportFrameReady";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly WebWorkspacePathResolver _pathResolver;

    public PngExportService()
        : this(new WebWorkspacePathResolver())
    {
    }

    public PngExportService(WebWorkspacePathResolver pathResolver)
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

        WebViewVisualState originalState = WebViewVisualState.Capture(webView);

        try
        {
            PrepareCaptureSurface(webView);
            SetViewportSize(webView, InitialViewportWidthCssPixels, InitialViewportHeightCssPixels);

            await ExportWebViewNavigator.NavigateToExportHtmlAsync(webView, request.HtmlDocument);
            await WaitForExportDocumentAsync(webView);

            ExportDocumentSize documentSize = await MeasureDocumentAsync(webView);
            double captureWidth = GetCaptureWidth(documentSize.Width);

            if (Math.Abs(captureWidth - InitialViewportWidthCssPixels) > 0.5)
            {
                SetViewportSize(webView, captureWidth, InitialViewportHeightCssPixels);
                await WaitForCaptureFrameAsync(webView);
                documentSize = await MeasureDocumentAsync(webView);
                captureWidth = GetCaptureWidth(documentSize.Width);
            }

            await CaptureFullDocumentAsync(webView, request.FilePath, captureWidth, documentSize.Height);
        }
        finally
        {
            originalState.Restore(webView);
        }
    }

    private static void PrepareCaptureSurface(WebView2 webView)
    {
        webView.Visibility = Visibility.Visible;
        webView.ZoomFactor = 1.0;
    }

    private static void SetViewportSize(WebView2 webView, double width, double height)
    {
        webView.Width = Math.Ceiling(width);
        webView.Height = Math.Ceiling(height);
        webView.UpdateLayout();
    }

    private static double GetCaptureWidth(double measuredWidth)
    {
        if (!double.IsFinite(measuredWidth) || measuredWidth <= 0)
            return InitialViewportWidthCssPixels;

        if (measuredWidth > MaximumViewportWidthCssPixels)
        {
            throw new InvalidOperationException(
                $"The document is too wide to export as a single PNG ({Math.Ceiling(measuredWidth)} CSS pixels). Try PDF or HTML export, or reduce very wide content such as tables or code blocks.");
        }

        return Math.Clamp(
            Math.Ceiling(Math.Max(InitialViewportWidthCssPixels, measuredWidth)),
            MinimumViewportWidthCssPixels,
            MaximumViewportWidthCssPixels);
    }

    private static async Task CaptureFullDocumentAsync(
        WebView2 webView,
        string filePath,
        double captureWidth,
        double documentHeight)
    {
        if (!double.IsFinite(documentHeight) || documentHeight <= 0)
            throw new InvalidOperationException("The PNG export document size could not be measured.");

        WriteableBitmap? finalImage = null;
        double pixelScaleY = 1;
        double scrollY = 0;

        while (scrollY < documentHeight - 0.5)
        {
            double remainingHeight = documentHeight - scrollY;
            double tileHeight = Math.Min(CaptureTileHeightCssPixels, remainingHeight);

            SetViewportSize(webView, captureWidth, tileHeight);
            await ScrollToAsync(webView, scrollY);
            await WaitForCaptureFrameAsync(webView);

            BitmapSource tile = await CaptureTileAsync(webView);

            if (finalImage is null)
            {
                pixelScaleY = tile.PixelHeight / tileHeight;
                int finalWidth = tile.PixelWidth;
                int finalHeight = GetFinalImageHeight(documentHeight, pixelScaleY);

                EnsureFinalImageSizeSupported(finalWidth, finalHeight);
                finalImage = new WriteableBitmap(
                    finalWidth,
                    finalHeight,
                    tile.DpiX,
                    tile.DpiY,
                    PixelFormats.Bgra32,
                    null);
            }

            int destinationY = (int)Math.Round(scrollY * pixelScaleY, MidpointRounding.AwayFromZero);
            CopyTileToFinalImage(finalImage, tile, destinationY);
            scrollY += tileHeight;
        }

        if (finalImage is null)
            throw new InvalidOperationException("The PNG export could not be captured.");

        SavePng(filePath, finalImage);
    }

    private static int GetFinalImageHeight(double documentHeight, double pixelScaleY)
    {
        double finalHeight = Math.Ceiling(documentHeight * pixelScaleY);

        if (!double.IsFinite(finalHeight) || finalHeight <= 0 || finalHeight > int.MaxValue)
            throw new InvalidOperationException("The PNG export document is too large to capture.");

        return (int)finalHeight;
    }

    private static void EnsureFinalImageSizeSupported(int width, int height)
    {
        if (width <= 0 || height <= 0)
            throw new InvalidOperationException("The PNG export document size could not be measured.");

        long pixelCount = (long)width * height;
        if (pixelCount > MaximumPngPixelCount)
        {
            throw new InvalidOperationException(
                $"The document is too large to export as a single PNG ({width} x {height} pixels). Try PDF or HTML export, or split the document into smaller sections.");
        }
    }

    private static async Task<BitmapSource> CaptureTileAsync(WebView2 webView)
    {
        using MemoryStream captureStream = new();

        await webView.CoreWebView2.CapturePreviewAsync(
            CoreWebView2CapturePreviewImageFormat.Png,
            captureStream);

        if (captureStream.Length == 0)
            throw new InvalidOperationException("The PNG export capture was empty.");

        captureStream.Position = 0;
        BitmapSource tile = BitmapFrame.Create(
            captureStream,
            BitmapCreateOptions.PreservePixelFormat,
            BitmapCacheOption.OnLoad);

        if (tile.Format != PixelFormats.Bgra32)
        {
            tile = new FormatConvertedBitmap(tile, PixelFormats.Bgra32, null, 0);
        }

        tile.Freeze();
        return tile;
    }

    private static void CopyTileToFinalImage(WriteableBitmap finalImage, BitmapSource tile, int destinationY)
    {
        int copyWidth = Math.Min(tile.PixelWidth, finalImage.PixelWidth);
        int copyHeight = Math.Min(tile.PixelHeight, finalImage.PixelHeight - destinationY);

        if (copyWidth <= 0 || copyHeight <= 0)
            return;

        int stride = copyWidth * 4;
        byte[] pixels = new byte[stride * copyHeight];

        tile.CopyPixels(
            new Int32Rect(0, 0, copyWidth, copyHeight),
            pixels,
            stride,
            0);

        finalImage.WritePixels(
            new Int32Rect(0, destinationY, copyWidth, copyHeight),
            pixels,
            stride,
            0);
    }

    private static void SavePng(string filePath, BitmapSource image)
    {
        PngBitmapEncoder encoder = new();
        encoder.Frames.Add(BitmapFrame.Create(image));

        using FileStream fileStream = new(filePath, FileMode.Create, FileAccess.Write, FileShare.None);
        encoder.Save(fileStream);
    }

    private static async Task WaitForExportDocumentAsync(WebView2 webView)
    {
        await webView.CoreWebView2.ExecuteScriptAsync(
            """
            (() => {
              window.draftPngExportReady = false;
              window.draftPngExportError = null;

              const waitForFrame = () => new Promise((resolve) => {
                let didResolve = false;
                const finish = () => {
                  if (didResolve) {
                    return;
                  }

                  didResolve = true;
                  resolve();
                };

                window.setTimeout(finish, 25);

                if (typeof window.requestAnimationFrame === 'function') {
                  window.requestAnimationFrame(() => {
                    window.requestAnimationFrame(finish);
                  });
                }
              });

              const waitForImages = () => Promise.all(Array.from(document.images).map((image) => {
                if (image.complete) {
                  return Promise.resolve();
                }

                return new Promise((resolve) => {
                  const timeoutId = window.setTimeout(resolve, 2000);
                  const finish = () => {
                    window.clearTimeout(timeoutId);
                    resolve();
                  };

                  image.addEventListener('load', finish, { once: true });
                  image.addEventListener('error', finish, { once: true });
                });
              }));

              Promise.resolve()
                .then(async () => {
                  if (document.fonts?.ready) {
                    await Promise.race([
                      document.fonts.ready,
                      new Promise((resolve) => window.setTimeout(resolve, 3000)),
                    ]);
                  }

                  await waitForImages();
                  window.scrollTo(0, 0);
                  await waitForFrame();
                  window.draftPngExportReady = true;
                })
                .catch((error) => {
                  window.draftPngExportError = error instanceof Error
                    ? error.message
                    : String(error);
                  window.draftPngExportReady = true;
                });
            })();
            """);

        await WaitForBooleanFlagAsync(webView, ReadyFlag, RenderTimeoutMilliseconds);

        string errorResult = await webView.CoreWebView2.ExecuteScriptAsync($"window.{ErrorFlag} ?? null");
        string? error = JsonSerializer.Deserialize<string?>(errorResult, JsonOptions);

        if (!string.IsNullOrWhiteSpace(error))
            throw new InvalidOperationException($"The PNG export preview could not be prepared: {error}");
    }

    private static async Task<ExportDocumentSize> MeasureDocumentAsync(WebView2 webView)
    {
        string scriptResult = await webView.CoreWebView2.ExecuteScriptAsync(
            """
            (() => {
              const rootElement = document.querySelector('.draft-export-preview') ?? document.body;
              const scrollElement = document.querySelector('.draft-export-preview .preview-scroll') ?? rootElement;
              const contentElement = document.querySelector('.draft-export-preview .preview-content') ?? scrollElement;
              const scrollRect = scrollElement.getBoundingClientRect();
              const contentRect = contentElement.getBoundingClientRect();
              const scrollStyle = window.getComputedStyle(scrollElement);
              const paddingLeft = Number.parseFloat(scrollStyle.paddingLeft) || 0;
              const paddingRight = Number.parseFloat(scrollStyle.paddingRight) || 0;
              const paddingBottom = Number.parseFloat(scrollStyle.paddingBottom) || 0;
              const contentRight = contentRect.right - scrollRect.left + paddingRight;
              const contentBottom = contentRect.bottom - scrollRect.top + paddingBottom;
              const width = Math.max(
                rootElement.clientWidth,
                scrollElement.clientWidth,
                contentElement.scrollWidth + paddingLeft + paddingRight,
                contentRight,
                1
              );
              const height = Math.max(
                contentElement.scrollHeight + paddingBottom,
                contentBottom,
                1
              );

              return {
                width: Math.ceil(width),
                height: Math.ceil(height)
              };
            })();
            """);

        ExportDocumentSize? documentSize = JsonSerializer.Deserialize<ExportDocumentSize>(
            scriptResult,
            JsonOptions);

        if (documentSize is null
            || !double.IsFinite(documentSize.Width)
            || !double.IsFinite(documentSize.Height)
            || documentSize.Width <= 0
            || documentSize.Height <= 0)
        {
            throw new InvalidOperationException("The PNG export document size could not be measured.");
        }

        return documentSize;
    }

    private static async Task ScrollToAsync(WebView2 webView, double y)
    {
        string scrollY = y.ToString(CultureInfo.InvariantCulture);
        await webView.CoreWebView2.ExecuteScriptAsync($"window.scrollTo(0, {scrollY});");
    }

    private static async Task WaitForCaptureFrameAsync(WebView2 webView)
    {
        await webView.CoreWebView2.ExecuteScriptAsync(
            """
            (() => {
              window.draftPngExportFrameReady = false;
              const finish = () => {
                window.draftPngExportFrameReady = true;
              };

              if (typeof window.requestAnimationFrame === 'function') {
                window.requestAnimationFrame(() => {
                  window.requestAnimationFrame(finish);
                });
                return;
              }

              window.setTimeout(finish, 25);
            })();
            """);

        await WaitForBooleanFlagAsync(
            webView,
            FrameReadyFlag,
            FrameTimeoutMilliseconds,
            shouldThrowOnTimeout: false);
    }

    private static async Task WaitForBooleanFlagAsync(
        WebView2 webView,
        string flagName,
        int timeoutMilliseconds,
        bool shouldThrowOnTimeout = true)
    {
        using CancellationTokenSource timeout = new(timeoutMilliseconds);

        while (!timeout.IsCancellationRequested)
        {
            string isReady = await webView.CoreWebView2.ExecuteScriptAsync($"Boolean(window.{flagName})");

            if (string.Equals(isReady, "true", StringComparison.OrdinalIgnoreCase))
                return;

            try
            {
                await Task.Delay(PollDelayMilliseconds, timeout.Token);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        if (shouldThrowOnTimeout)
            throw new InvalidOperationException("The PNG export preview did not finish rendering in time.");
    }

    private sealed record ExportDocumentSize(
        [property: JsonPropertyName("width")] double Width,
        [property: JsonPropertyName("height")] double Height);

    private sealed record WebViewVisualState(
        double Width,
        double Height,
        double ZoomFactor,
        Visibility Visibility)
    {
        public static WebViewVisualState Capture(WebView2 webView)
        {
            return new WebViewVisualState(
                webView.Width,
                webView.Height,
                webView.ZoomFactor,
                webView.Visibility);
        }

        public void Restore(WebView2 webView)
        {
            webView.Width = Width;
            webView.Height = Height;
            webView.ZoomFactor = ZoomFactor;
            webView.Visibility = Visibility;
            webView.UpdateLayout();
        }
    }
}
