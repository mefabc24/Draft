namespace Draft.Export.Models;

public sealed record DocumentExportRequest(
    ExportFormat Format,
    string FilePath,
    string HtmlDocument);
