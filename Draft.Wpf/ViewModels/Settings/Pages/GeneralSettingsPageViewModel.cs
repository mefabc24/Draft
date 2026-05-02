namespace Draft.ViewModels;

public sealed class GeneralSettingsPageViewModel : SettingsPageViewModel
{
    public GeneralSettingsPageViewModel(SettingsViewModel settings)
        : base("General", "Startup, saving, and file defaults for Draft.", settings)
    {
    }
}
