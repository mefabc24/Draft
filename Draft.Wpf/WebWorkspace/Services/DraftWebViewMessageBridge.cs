using Draft.Settings.Models;
using Draft.Settings.Shortcuts;
using Draft.WebWorkspace.Messages;
using Microsoft.Web.WebView2.Core;
using System.Text.Json;

namespace Draft.WebWorkspace.Services;

public sealed class DraftWebViewMessageBridge
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public void PostSettings(CoreWebView2? webView, DraftSettings settings)
    {
        string message = JsonSerializer.Serialize(CreateSettingsMessage(settings), JsonOptions);

        webView?.PostWebMessageAsString(message);
    }

    public void PostStartupState(
        CoreWebView2? webView,
        DraftSettings settings,
        string content,
        string displayFileName,
        string? filePath,
        bool isUntitled,
        bool isModified,
        string workspaceMode,
        int documentGeneration)
    {
        string message = JsonSerializer.Serialize(new StartupStateMessage(
            DraftWebViewMessageTypes.StartupState,
            new StartupDocumentMessage(
                content,
                displayFileName,
                filePath,
                isUntitled,
                isModified),
            workspaceMode,
            documentGeneration,
            CreateSettingsMessage(settings)),
            JsonOptions);

        webView?.PostWebMessageAsString(message);
    }

    private static SettingsChangedMessage CreateSettingsMessage(DraftSettings settings)
    {
        return new SettingsChangedMessage(
            DraftWebViewMessageTypes.SettingsChanged,
            LocalizationService.ResolveLanguageCode(settings.AppLanguage),
            "draftDark",
            MarkdownPreviewThemeCatalog.GetThemeId(settings.MarkdownTheme),
            settings.EditorFontFamily,
            settings.EditorFontSize,
            settings.LineHeight,
            settings.WordWrap,
            settings.ShowLineNumbers,
            settings.HighlightCurrentLine,
            settings.ShowWhitespaceCharacters,
            settings.ShowIndentationGuides,
            settings.TabSize,
            settings.InsertSpacesInsteadOfTabs,
            settings.AutoPairBrackets,
            settings.AutoPairQuotes,
            settings.MarkdownSyntaxHighlighting,
            settings.CursorStyle,
            settings.CursorBlinking,
            settings.PreviewScrollSyncMode,
            settings.FloatingMarkdownToolbarMode,
            ShortcutSettingsCatalog.Normalize(settings.Shortcuts));
    }

    public void PostDocument(
        CoreWebView2? webView,
        string content,
        string fileName,
        string? filePath,
        bool isUntitled,
        int documentGeneration)
    {
        string message = JsonSerializer.Serialize(new LoadDocumentMessage(
            DraftWebViewMessageTypes.LoadDocument,
            content,
            fileName,
            filePath,
            isUntitled,
            documentGeneration),
            JsonOptions);

        webView?.PostWebMessageAsString(message);
    }

    public void PostGoToPosition(CoreWebView2? webView, int line, int column)
    {
        string message = JsonSerializer.Serialize(new GoToPositionMessage(
            DraftWebViewMessageTypes.GoToPosition,
            line,
            column),
            JsonOptions);

        webView?.PostWebMessageAsString(message);
    }

    public void PostWorkspaceMode(CoreWebView2? webView, string mode)
    {
        string message = JsonSerializer.Serialize(new WorkspaceModeMessage(
            DraftWebViewMessageTypes.WorkspaceModeChanged,
            mode),
            JsonOptions);

        webView?.PostWebMessageAsString(message);
    }

    public async Task<string> GetPreviewExportHtmlAsync(CoreWebView2? webView, bool usePdfLayout = false)
        => await GetPreviewExportHtmlAsync(webView, usePdfLayout ? "pdf" : "html");

    public async Task<string> GetPreviewExportHtmlAsync(CoreWebView2? webView, string layout)
        => await GetPreviewExportHtmlAsync(webView, layout, null);

    public async Task<string> GetPreviewExportHtmlAsync(
        CoreWebView2? webView,
        string layout,
        string? previewThemeId)
    {
        if (webView is null)
            throw new InvalidOperationException(LocalizationService.Translate(
                "export.previewWebViewNotReady",
                "The preview WebView is not ready."));

        string normalizedLayout = NormalizePreviewExportLayout(layout);
        string layoutJson = JsonSerializer.Serialize(normalizedLayout, JsonOptions);
        string previewThemeIdJson = JsonSerializer.Serialize(previewThemeId, JsonOptions);
        string scriptResult = await webView.ExecuteScriptAsync(
            $"window.draftExport?.createPreviewHtml?.({{ layout: {layoutJson}, previewThemeId: {previewThemeIdJson} }}) ?? null");
        string? htmlDocument = JsonSerializer.Deserialize<string?>(scriptResult, JsonOptions);

        if (string.IsNullOrWhiteSpace(htmlDocument))
            throw new InvalidOperationException(LocalizationService.Translate(
                "export.previewHtmlCouldNotBeCreated",
                "The preview export HTML could not be created."));

        return htmlDocument;
    }

    private static string NormalizePreviewExportLayout(string? layout)
    {
        return layout is "pdf" or "png"
            ? layout
            : "html";
    }

    public void DispatchIncomingMessage(
        string? message,
        Action workspaceReady,
        Action<int?> startupStateApplied,
        Action<string> workspaceModeChanged,
        Action<string, int?> documentChanged,
        Action<int, int, int> cursorPositionChanged,
        Action saveRequested,
        Action openRequested,
        Action<string> openExternalUrl)
    {
        if (string.IsNullOrWhiteSpace(message))
            return;

        try
        {
            using JsonDocument document = JsonDocument.Parse(message);
            JsonElement root = document.RootElement;

            if (!root.TryGetProperty("type", out JsonElement typeElement))
                return;

            string? type = typeElement.GetString();

            switch (type)
            {
                case DraftWebViewMessageTypes.WorkspaceReady:
                    workspaceReady();
                    break;
                case DraftWebViewMessageTypes.StartupStateApplied:
                    DispatchStartupStateAppliedMessage(root, startupStateApplied);
                    break;
                case DraftWebViewMessageTypes.WorkspaceModeChanged:
                    DispatchWorkspaceModeMessage(root, workspaceModeChanged);
                    break;
                case DraftWebViewMessageTypes.DocumentChanged:
                    DispatchDocumentChangedMessage(root, documentChanged);
                    break;
                case DraftWebViewMessageTypes.CursorPositionChanged:
                    DispatchCursorPositionChangedMessage(root, cursorPositionChanged);
                    break;
                case DraftWebViewMessageTypes.SaveRequested:
                    saveRequested();
                    break;
                case DraftWebViewMessageTypes.OpenRequested:
                    openRequested();
                    break;
                case DraftWebViewMessageTypes.OpenExternalUrl:
                    DispatchOpenExternalUrlMessage(root, openExternalUrl);
                    break;
            }
        }
        catch (JsonException)
        {
            return;
        }
    }

    private static void DispatchStartupStateAppliedMessage(
        JsonElement root,
        Action<int?> startupStateApplied)
    {
        startupStateApplied(ReadOptionalInt32(root, "documentGeneration"));
    }

    private static void DispatchWorkspaceModeMessage(
        JsonElement root,
        Action<string> workspaceModeChanged)
    {
        if (!root.TryGetProperty("mode", out JsonElement modeElement))
            return;

        string? mode = modeElement.GetString();

        if (!string.IsNullOrWhiteSpace(mode))
        {
            workspaceModeChanged(mode);
        }
    }

    private static void DispatchDocumentChangedMessage(
        JsonElement root,
        Action<string, int?> documentChanged)
    {
        if (!root.TryGetProperty("content", out JsonElement contentElement))
            return;

        documentChanged(
            contentElement.GetString() ?? string.Empty,
            ReadOptionalInt32(root, "documentGeneration"));
    }

    private static void DispatchCursorPositionChangedMessage(
        JsonElement root,
        Action<int, int, int> cursorPositionChanged)
    {
        if (!root.TryGetProperty("line", out JsonElement lineElement)
            || !root.TryGetProperty("column", out JsonElement columnElement))
        {
            return;
        }

        int selectedCharacterCount = root.TryGetProperty(
            "selectedCharacterCount",
            out JsonElement selectedCharacterCountElement)
                && selectedCharacterCountElement.TryGetInt32(out int selectedCount)
            ? selectedCount
            : 0;

        if (lineElement.TryGetInt32(out int line)
            && columnElement.TryGetInt32(out int column))
        {
            cursorPositionChanged(line, column, selectedCharacterCount);
        }
    }

    private static void DispatchOpenExternalUrlMessage(
        JsonElement root,
        Action<string> openExternalUrl)
    {
        if (!root.TryGetProperty("url", out JsonElement urlElement))
            return;

        string? url = urlElement.GetString();

        if (!string.IsNullOrWhiteSpace(url))
        {
            openExternalUrl(url);
        }
    }

    private static int? ReadOptionalInt32(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out JsonElement propertyElement))
            return null;

        return propertyElement.TryGetInt32(out int value)
            ? value
            : null;
    }
}
