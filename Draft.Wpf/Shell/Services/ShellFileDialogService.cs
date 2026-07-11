using Draft.Documents.Models;
using Draft.Export.Models;
using Draft.Localization;
using Microsoft.Win32;
using System.IO;
using System.Windows;

namespace Draft.Shell.Services;

public sealed class ShellFileDialogService
{
    public string? ShowOpenFileDialog(Window owner)
    {
        OpenFileDialog dialog = new()
        {
            Filter = SupportedDocumentTypes.GetDialogFilter(),
            CheckFileExists = true,
            Multiselect = false,
        };

        return dialog.ShowDialog(owner) == true
            ? dialog.FileName
            : null;
    }

    public string? ShowSaveFileDialog(
        Window owner,
        string displayFileName,
        string? defaultSaveLocation)
    {
        SaveFileDialog dialog = new()
        {
            Filter = SupportedDocumentTypes.GetDialogFilter(),
            DefaultExt = SupportedDocumentTypes.DefaultExtension,
            AddExtension = true,
            OverwritePrompt = true,
            FileName = displayFileName,
        };

        if (!string.IsNullOrWhiteSpace(defaultSaveLocation)
            && Directory.Exists(defaultSaveLocation))
        {
            dialog.InitialDirectory = defaultSaveLocation;
        }

        return dialog.ShowDialog(owner) == true
            ? dialog.FileName
            : null;
    }

    public string? ShowExportSaveFileDialog(
        Window owner,
        ExportFormat format,
        string? currentFilePath,
        string? defaultSaveLocation)
    {
        SaveFileDialog dialog = new()
        {
            Filter = GetExportFilter(format),
            DefaultExt = GetExportDefaultExtension(format),
            AddExtension = true,
            OverwritePrompt = true,
            FileName = CreateExportFileName(format, currentFilePath),
        };

        string? initialDirectory = GetExportInitialDirectory(currentFilePath, defaultSaveLocation);
        if (initialDirectory is not null)
        {
            dialog.InitialDirectory = initialDirectory;
        }

        return dialog.ShowDialog(owner) == true
            ? dialog.FileName
            : null;
    }

    private static string GetExportFilter(ExportFormat format)
    {
        return format switch
        {
            ExportFormat.Html => $"{LocalizationService.Translate("dialog.fileFilter.htmlFiles", "HTML files (*.html)")}|*.html",
            ExportFormat.Png => $"{LocalizationService.Translate("dialog.fileFilter.pngFiles", "PNG files (*.png)")}|*.png",
            _ => $"{LocalizationService.Translate("dialog.fileFilter.pdfFiles", "PDF files (*.pdf)")}|*.pdf",
        };
    }

    private static string GetExportDefaultExtension(ExportFormat format)
    {
        return format switch
        {
            ExportFormat.Html => ".html",
            ExportFormat.Png => ".png",
            _ => ".pdf",
        };
    }

    private static string CreateExportFileName(ExportFormat format, string? currentFilePath)
    {
        string? baseFileName = !string.IsNullOrWhiteSpace(currentFilePath)
            ? Path.GetFileNameWithoutExtension(currentFilePath)
            : null;

        if (string.IsNullOrWhiteSpace(baseFileName))
        {
            baseFileName = LocalizationService.Translate("export.defaultFileName", "Draft-Export");
        }

        return $"{baseFileName}{GetExportDefaultExtension(format)}";
    }

    private static string? GetExportInitialDirectory(string? currentFilePath, string? defaultSaveLocation)
    {
        if (!string.IsNullOrWhiteSpace(currentFilePath))
        {
            string? currentDirectory = Path.GetDirectoryName(currentFilePath);
            if (!string.IsNullOrWhiteSpace(currentDirectory) && Directory.Exists(currentDirectory))
            {
                return currentDirectory;
            }
        }

        return !string.IsNullOrWhiteSpace(defaultSaveLocation) && Directory.Exists(defaultSaveLocation)
            ? defaultSaveLocation
            : null;
    }
}
