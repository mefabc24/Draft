using Draft.Settings.Models;
using Draft.WebWorkspace.Messages;
using Microsoft.Web.WebView2.Core;
using System.Text.Json;

namespace Draft.WebWorkspace.Services;

public sealed class DraftWebViewMessageBridge
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public void PostSettings(CoreWebView2? webView, DraftSettings settings)
    {
        string message = JsonSerializer.Serialize(new SettingsChangedMessage(
            DraftWebViewMessageTypes.SettingsChanged,
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
            settings.FloatingMarkdownToolbarMode),
            JsonOptions);

        webView?.PostWebMessageAsString(message);
    }

    public void PostDocument(CoreWebView2? webView, string content, string fileName)
    {
        string message = JsonSerializer.Serialize(new LoadDocumentMessage(
            DraftWebViewMessageTypes.LoadDocument,
            content,
            fileName),
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

    public void DispatchIncomingMessage(
        string? message,
        Action<string> workspaceModeChanged,
        Action<string> documentChanged,
        Action<int, int, int> cursorPositionChanged,
        Action saveRequested)
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
            }
        }
        catch (JsonException)
        {
            return;
        }
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
        Action<string> documentChanged)
    {
        if (!root.TryGetProperty("content", out JsonElement contentElement))
            return;

        documentChanged(contentElement.GetString() ?? string.Empty);
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
}
