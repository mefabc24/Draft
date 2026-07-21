using Draft.Settings.Models;

namespace Draft.Settings.ViewModels.Pages;

public sealed class FloatingMarkdownToolbarSettingsPageViewModel
    : MenuCustomizationSettingsPageViewModel
{
    public FloatingMarkdownToolbarSettingsPageViewModel(SettingsWindowViewModel settings)
        : base(
            "settings.floatingMarkdownToolbar",
            "Floating Markdown Toolbar",
            settings,
            MenuCustomizationCatalog.FloatingMarkdownToolbarDefinitions,
            MenuCustomizationCatalog.NormalizeFloatingMarkdownToolbarItems)
    {
        LoadItems(settings.FloatingMarkdownToolbarItems);
    }
}
