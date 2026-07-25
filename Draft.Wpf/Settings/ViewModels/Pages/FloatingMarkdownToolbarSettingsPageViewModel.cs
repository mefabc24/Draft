using Draft.Settings.Models;

namespace Draft.Settings.ViewModels.Pages;

public sealed class FloatingMarkdownToolbarSettingsPageViewModel
    : MenuCustomizationSettingsPageViewModel
{
    private bool _showListStylesDropdown = true;
    private bool _showTextStylesDropdown = true;

    public FloatingMarkdownToolbarSettingsPageViewModel(SettingsWindowViewModel settings)
        : base(
            "settings.floatingMarkdownToolbar",
            "Markdown Toolbar",
            settings,
            MenuCustomizationCatalog.FloatingMarkdownToolbarDefinitions,
            MenuCustomizationCatalog.CreateDefaultFloatingMarkdownToolbarItems,
            MenuCustomizationCatalog.NormalizeFloatingMarkdownToolbarItems)
    {
        LoadItems(settings.FloatingMarkdownToolbarItems);
    }

    public string FixedControlsSectionTitle => Translate(
        "settings.floatingMarkdownToolbar.sections.fixedControls",
        "FIXED CONTROLS");

    public string TextStylesDropdownLabel => Translate(
        "settings.floatingMarkdownToolbar.items.heading",
        "Text Styles");

    public string TextStylesDropdownDescription => Translate(
        "settings.floatingMarkdownToolbar.items.heading.description",
        "Show the text-style dropdown on the left side of the toolbar.");

    public string ListStylesDropdownLabel => Translate(
        "settings.floatingMarkdownToolbar.items.list",
        "List Styles");

    public string ListStylesDropdownDescription => Translate(
        "settings.floatingMarkdownToolbar.items.list.description",
        "Show the list-style dropdown on the right side of the toolbar.");

    public bool ShowTextStylesDropdown
    {
        get => _showTextStylesDropdown;
        set => SetProperty(ref _showTextStylesDropdown, value);
    }

    public bool ShowListStylesDropdown
    {
        get => _showListStylesDropdown;
        set => SetProperty(ref _showListStylesDropdown, value);
    }

    public override void RefreshLocalization()
    {
        base.RefreshLocalization();
        OnPropertyChanged(nameof(FixedControlsSectionTitle));
        OnPropertyChanged(nameof(TextStylesDropdownLabel));
        OnPropertyChanged(nameof(TextStylesDropdownDescription));
        OnPropertyChanged(nameof(ListStylesDropdownLabel));
        OnPropertyChanged(nameof(ListStylesDropdownDescription));
    }

    protected override bool TryLoadFixedItem(MenuItemCustomization item)
    {
        bool enabled = !string.Equals(
            item.Placement,
            MenuCustomizationPlacement.Disabled,
            StringComparison.OrdinalIgnoreCase);

        switch (item.Id)
        {
            case "heading":
                ShowTextStylesDropdown = enabled;
                return true;
            case "list":
                ShowListStylesDropdown = enabled;
                return true;
            default:
                return false;
        }
    }

    protected override IEnumerable<MenuItemCustomization> CaptureFixedItems()
    {
        return
        [
            new MenuItemCustomization(
                "heading",
                ShowTextStylesDropdown
                    ? MenuCustomizationPlacement.Visible
                    : MenuCustomizationPlacement.Disabled),
            new MenuItemCustomization(
                "list",
                ShowListStylesDropdown
                    ? MenuCustomizationPlacement.Visible
                    : MenuCustomizationPlacement.Disabled),
        ];
    }
}
