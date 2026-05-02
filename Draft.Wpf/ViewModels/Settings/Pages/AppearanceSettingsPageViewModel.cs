namespace Draft.ViewModels;

public sealed class AppearanceSettingsPageViewModel : SettingsPageViewModel
{
    public AppearanceSettingsPageViewModel(SettingsViewModel settings)
        : base("Appearance", "Theme and interface layout preferences.", settings)
    {
    }
}
