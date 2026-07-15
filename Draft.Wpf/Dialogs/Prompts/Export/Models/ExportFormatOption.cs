using Draft.Export.Models;

namespace Draft.Dialogs.Prompts.Export.Models;

public sealed record ExportFormatOption(ExportFormat Format, string DisplayName)
{
    public override string ToString()
    {
        return DisplayName;
    }
}
