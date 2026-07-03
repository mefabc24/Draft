using Draft.Export.Models;
using Draft.Settings.Services;

namespace Draft.Dialogs.Prompts.Export.Models;

public sealed class ExportPromptRequest
{
    public ExportPromptRequest(
        ExportFormat defaultFormat = ExportFormat.Pdf,
        string defaultPreviewTheme = SettingsDefaults.DefaultMarkdownTheme)
    {
        DefaultFormat = defaultFormat;
        DefaultPreviewTheme = defaultPreviewTheme;
    }

    public ExportFormat DefaultFormat { get; }

    public string DefaultPreviewTheme { get; }
}
