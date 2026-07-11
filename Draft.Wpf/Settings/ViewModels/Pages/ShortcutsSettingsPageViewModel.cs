using Draft.Settings.Shortcuts;

namespace Draft.Settings.ViewModels.Pages;

public sealed class ShortcutsSettingsPageViewModel : SettingsPageViewModel
{
    private readonly IReadOnlyList<ShortcutItemViewModel> _shortcuts;

    public ShortcutsSettingsPageViewModel(SettingsWindowViewModel settings)
        : base("settings.shortcuts", "Shortcuts", settings)
    {
        Categories = ShortcutSettingsCatalog.Categories
            .Select(category => new ShortcutCategoryViewModel(
                category.Title,
                category.Shortcuts
                    .Select(shortcut => new ShortcutItemViewModel(settings, shortcut))
                    .ToArray()))
            .ToArray();
        _shortcuts = Categories
            .SelectMany(category => category.Shortcuts)
            .ToArray();
    }

    public IReadOnlyList<ShortcutCategoryViewModel> Categories { get; }

    public void RefreshShortcuts()
    {
        foreach (ShortcutItemViewModel shortcut in _shortcuts)
        {
            shortcut.RefreshShortcut();
        }
    }
}

public sealed record ShortcutCategoryViewModel(
    string Title,
    IReadOnlyList<ShortcutItemViewModel> Shortcuts);

public sealed class ShortcutItemViewModel : BaseViewModel
{
    private readonly ShortcutActionDefinition _definition;
    private readonly SettingsWindowViewModel _settings;

    public ShortcutItemViewModel(
        SettingsWindowViewModel settings,
        ShortcutActionDefinition definition)
    {
        _settings = settings;
        _definition = definition;
    }

    public string Title => _definition.Title;

    public string Description => _definition.Description;

    public string DefaultShortcut => _definition.DefaultShortcut;

    public bool IsEditable => _definition.IsEditable;

    public string Shortcut
    {
        get => _settings.GetShortcut(_definition.Id);
        set
        {
            _settings.SetShortcut(_definition.Id, value);
            OnPropertyChanged();
        }
    }

    public void RefreshShortcut()
    {
        OnPropertyChanged(nameof(Shortcut));
    }
}
