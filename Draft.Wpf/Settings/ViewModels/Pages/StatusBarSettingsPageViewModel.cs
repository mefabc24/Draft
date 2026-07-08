using Draft.Settings.ViewModels;

namespace Draft.Settings.ViewModels.Pages;

public sealed class StatusBarSettingsPageViewModel : SettingsPageViewModel
{
    public StatusBarSettingsPageViewModel(SettingsWindowViewModel settings)
        : base("Status Bar", settings)
    {
    }
}
