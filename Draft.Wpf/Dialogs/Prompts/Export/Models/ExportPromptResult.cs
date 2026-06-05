using Draft.Export.Models;

namespace Draft.Dialogs.Prompts.Export.Models;

public sealed record ExportPromptResult(bool IsConfirmed, ExportFormat Format)
{
    public static ExportPromptResult Cancelled { get; } = new(false, ExportFormat.Pdf);

    public static ExportPromptResult Confirmed(ExportFormat format)
    {
        return new ExportPromptResult(true, format);
    }
}
