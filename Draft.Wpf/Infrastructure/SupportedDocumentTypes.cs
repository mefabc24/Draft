using System;
using System.Collections.Generic;
using System.IO;

namespace Draft.Helpers;

public static class SupportedDocumentTypes
{
    public const string DefaultFileName = "untitled.md";
    public const string DialogFilter = "Markdown and text files|*.md;*.markdown;*.mdown;*.mkd;*.txt|All files|*.*";
    public const string DefaultExtension = ".md";

    private static readonly HashSet<string> SupportedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".md",
        ".markdown",
        ".mdown",
        ".mkd",
        ".txt",
    };

    public static bool IsSupportedPath(string path)
    {
        return SupportedExtensions.Contains(Path.GetExtension(path));
    }

    public static bool IsSupportedExistingFile(string path)
    {
        return File.Exists(path) && IsSupportedPath(path);
    }
}
