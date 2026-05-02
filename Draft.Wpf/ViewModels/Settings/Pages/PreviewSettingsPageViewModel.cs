namespace Draft.ViewModels;

public sealed class PreviewSettingsPageViewModel : SettingsPageViewModel
{
    public PreviewSettingsPageViewModel(SettingsViewModel settings)
        : base("Preview", "Markdown preview rendering, link behavior, and scrolling preferences.", settings)
    {
    }
}
