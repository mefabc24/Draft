using Draft.Documents.Models;
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
            Filter = SupportedDocumentTypes.DialogFilter,
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
            Filter = SupportedDocumentTypes.DialogFilter,
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
}
