using Microsoft.Win32;
using System.IO;

namespace Draft.Settings.Services;

public sealed class SettingsFileDialogService
{
    public string? BrowseDefaultSaveLocation(string currentLocation)
    {
        OpenFolderDialog dialog = new()
        {
            Title = "Choose default save location",
            InitialDirectory = Directory.Exists(currentLocation)
                ? currentLocation
                : Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
            Multiselect = false,
        };

        return dialog.ShowDialog() == true
            ? dialog.FolderName
            : null;
    }
}
