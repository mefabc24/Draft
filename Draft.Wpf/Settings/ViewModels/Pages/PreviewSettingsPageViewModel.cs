using Draft.Settings.Models;
using Draft.Settings.ViewModels;

namespace Draft.Settings.ViewModels.Pages;

public sealed class PreviewSettingsPageViewModel : SettingsPageViewModel
{
    public PreviewSettingsPageViewModel(SettingsWindowViewModel settings)
        : base("Preview", settings)
    {
    }

    public IReadOnlyList<string> MarkdownThemeOptions =>
        SettingsOptionCatalog.MarkdownThemeOptions;
}
