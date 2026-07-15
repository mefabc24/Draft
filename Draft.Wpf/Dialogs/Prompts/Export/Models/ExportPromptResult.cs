using Draft.Export.Models;
using Draft.Settings.Models;
using Draft.Settings.Services;

namespace Draft.Dialogs.Prompts.Export.Models;

public sealed record ExportPromptResult(bool IsConfirmed, ExportFormat Format, string PreviewThemeId)
{
    public static ExportPromptResult Cancelled { get; } = new(
        false,
        ExportFormat.Pdf,
        MarkdownPreviewThemeCatalog.GetThemeId(SettingsDefaults.DefaultMarkdownTheme));

    public static ExportPromptResult Confirmed(ExportFormat format, string previewThemeId)
    {
        return new ExportPromptResult(true, format, previewThemeId);
    }
}
