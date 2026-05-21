using System.IO;

namespace Draft.WebWorkspace.Services;

public sealed class WebWorkspacePathResolver
{
    public string GetWebRootPath()
    {
        string outputWebRootPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "Web"));
        string sourceWebRootPath = Path.GetFullPath(Path.Combine(
            AppContext.BaseDirectory,
            "..",
            "..",
            "..",
            "..",
            "Draft.Web",
            "dist"));

        return Directory.Exists(sourceWebRootPath) ? sourceWebRootPath : outputWebRootPath;
    }
}
