using System;
using System.Collections.Generic;
using System.IO;
using Draft.Localization;

namespace Draft.Documents.Models;

public static class SupportedDocumentTypes
{
    public const string DefaultFileName = "untitled.md";
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

    public static string GetDialogFilter()
    {
        string documentFiles = LocalizationService.Translate(
            "dialog.fileFilter.markdownTextFiles",
            "Markdown and text files");
        string allFiles = LocalizationService.Translate(
            "dialog.fileFilter.allFiles",
            "All files");

        return $"{documentFiles}|*.md;*.markdown;*.mdown;*.mkd;*.txt|{allFiles}|*.*";
    }

    public static bool IsSupportedExistingFile(string path)
    {
        return File.Exists(path) && IsSupportedPath(path);
    }
}
