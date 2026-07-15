using Draft.Settings.Models;
using Draft.Settings.ViewModels;

namespace Draft.Settings.ViewModels.Pages;

public sealed class AppearanceSettingsPageViewModel : SettingsPageViewModel
{
    public AppearanceSettingsPageViewModel(SettingsWindowViewModel settings)
        : base("settings.appearance", "Appearance", settings)
    {
    }

    public IReadOnlyList<string> AppThemeOptions =>
        SettingsOptionCatalog.AppThemeOptions;

    public IReadOnlyList<string> ToolbarControlbarPositionOptions =>
        SettingsOptionCatalog.ToolbarControlbarPositionOptions;
}
