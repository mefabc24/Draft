using Draft.Settings.ViewModels;

namespace Draft.Settings.ViewModels.Pages;

public sealed class AboutSettingsPageViewModel : SettingsPageViewModel
{
    public AboutSettingsPageViewModel(SettingsWindowViewModel settings)
        : base("settings.about", "About", settings)
    {
    }
}
