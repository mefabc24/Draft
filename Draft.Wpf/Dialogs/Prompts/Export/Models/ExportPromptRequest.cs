using Draft.Export.Models;

namespace Draft.Dialogs.Prompts.Export.Models;

public sealed class ExportPromptRequest
{
    public ExportPromptRequest(ExportFormat defaultFormat = ExportFormat.Pdf)
    {
        DefaultFormat = defaultFormat;
    }

    public ExportFormat DefaultFormat { get; }
}
