using Draft.Settings.ViewModels;

namespace Draft.Settings.ViewModels.Pages;

public sealed class StatusBarSettingsPageViewModel : SettingsPageViewModel
{
    public StatusBarSettingsPageViewModel(SettingsWindowViewModel settings)
        : base("settings.statusBar", "Status Bar", settings)
    {
    }
}
