using Draft.Settings.Models;

namespace Draft.Settings.ViewModels.Pages;

public sealed class QuickInsertSettingsPageViewModel
    : MenuCustomizationSettingsPageViewModel
{
    public QuickInsertSettingsPageViewModel(SettingsWindowViewModel settings)
        : base(
            "settings.quickInsertMenu",
            "Insert Menu",
            settings,
            MenuCustomizationCatalog.QuickInsertMenuDefinitions,
            MenuCustomizationCatalog.CreateDefaultQuickInsertMenuItems,
            MenuCustomizationCatalog.NormalizeQuickInsertMenuItems)
    {
        LoadItems(settings.QuickInsertMenuItems);
    }
}
