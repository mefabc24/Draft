using Draft.Settings.Models;
using Draft.Settings.ViewModels;

namespace Draft.Settings.ViewModels.Pages;

public sealed class EditorSettingsPageViewModel : SettingsPageViewModel
{
    public EditorSettingsPageViewModel(SettingsWindowViewModel settings)
        : base("settings.editor", "Editor", settings)
    {
    }

    public IReadOnlyList<string> EditorFontFamilyOptions =>
        SettingsOptionCatalog.EditorFontFamilyOptions;

    public IReadOnlyList<int> EditorFontSizeOptions =>
        SettingsOptionCatalog.EditorFontSizeOptions;

    public IReadOnlyList<double> LineHeightOptions =>
        SettingsOptionCatalog.LineHeightOptions;

    public IReadOnlyList<string> ShowWhitespaceCharactersOptions =>
        SettingsOptionCatalog.ShowWhitespaceCharactersOptions;

    public IReadOnlyList<int> TabSizeOptions =>
        SettingsOptionCatalog.TabSizeOptions;

    public IReadOnlyList<string> CursorStyleOptions =>
        SettingsOptionCatalog.CursorStyleOptions;
}
