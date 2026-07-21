using System.Collections.ObjectModel;
using Draft.Settings.Models;

namespace Draft.Settings.ViewModels.Pages;

public abstract class MenuCustomizationSettingsPageViewModel : SettingsPageViewModel
{
    private readonly IReadOnlyDictionary<string, MenuCustomizationDefinition> _definitionsById;
    private readonly Func<IEnumerable<MenuItemCustomization>?, List<MenuItemCustomization>> _normalizeItems;

    protected MenuCustomizationSettingsPageViewModel(
        string titleKey,
        string fallbackTitle,
        SettingsWindowViewModel settings,
        IReadOnlyList<MenuCustomizationDefinition> definitions,
        Func<IEnumerable<MenuItemCustomization>?, List<MenuItemCustomization>> normalizeItems)
        : base(titleKey, fallbackTitle, settings)
    {
        _definitionsById = definitions.ToDictionary(
            definition => definition.Id,
            StringComparer.Ordinal);
        _normalizeItems = normalizeItems;
    }

    public ObservableCollection<MenuCustomizationItemViewModel> VisibleItems { get; } = new();

    public ObservableCollection<MenuCustomizationItemViewModel> OverflowItems { get; } = new();

    public ObservableCollection<MenuCustomizationItemViewModel> DisabledItems { get; } = new();

    public string VisibleSectionTitle => Translate(
        "settings.menuCustomization.sections.visible",
        "VISIBLE");

    public string OverflowSectionTitle => Translate(
        "settings.menuCustomization.sections.overflow",
        "EXPANDABLE OVERFLOW");

    public string DisabledSectionTitle => Translate(
        "settings.menuCustomization.sections.disabled",
        "DISABLED");

    public void LoadItems(IEnumerable<MenuItemCustomization>? items)
    {
        VisibleItems.Clear();
        OverflowItems.Clear();
        DisabledItems.Clear();

        foreach (MenuItemCustomization customization in _normalizeItems(items))
        {
            if (!_definitionsById.TryGetValue(
                customization.Id,
                out MenuCustomizationDefinition? definition))
            {
                continue;
            }

            MenuCustomizationItemViewModel item = new(
                this,
                definition,
                customization.Placement);
            GetCollection(item.Placement).Add(item);
        }
    }

    public List<MenuItemCustomization> CaptureItems()
    {
        IEnumerable<MenuItemCustomization> capturedItems = VisibleItems
            .Concat(OverflowItems)
            .Concat(DisabledItems)
            .Select(item => new MenuItemCustomization(item.Id, item.Placement));

        return _normalizeItems(capturedItems);
    }

    public bool CanMoveItemRelativeTo(
        MenuCustomizationItemViewModel source,
        MenuCustomizationItemViewModel target)
        => ReferenceEquals(source.Owner, this)
            && ReferenceEquals(target.Owner, this)
            && !ReferenceEquals(source, target)
            && string.Equals(
                source.Placement,
                target.Placement,
                StringComparison.Ordinal);

    public void MoveItemRelativeTo(
        MenuCustomizationItemViewModel source,
        MenuCustomizationItemViewModel target,
        bool insertAfter)
    {
        if (!CanMoveItemRelativeTo(source, target))
            return;

        ObservableCollection<MenuCustomizationItemViewModel> collection =
            GetCollection(source.Placement);
        int sourceIndex = collection.IndexOf(source);
        int targetIndex = collection.IndexOf(target);

        if (sourceIndex < 0 || targetIndex < 0)
            return;

        int destinationIndex = targetIndex + (insertAfter ? 1 : 0);

        if (sourceIndex < destinationIndex)
            destinationIndex--;

        destinationIndex = Math.Clamp(destinationIndex, 0, collection.Count - 1);

        if (sourceIndex != destinationIndex)
        {
            collection.Move(sourceIndex, destinationIndex);
        }
    }

    internal bool MoveItemByOffset(
        MenuCustomizationItemViewModel item,
        int offset)
    {
        if (!ReferenceEquals(item.Owner, this) || offset == 0)
            return false;

        ObservableCollection<MenuCustomizationItemViewModel> collection =
            GetCollection(item.Placement);
        int sourceIndex = collection.IndexOf(item);
        int destinationIndex = sourceIndex + offset;

        if (sourceIndex < 0
            || destinationIndex < 0
            || destinationIndex >= collection.Count)
        {
            return false;
        }

        collection.Move(sourceIndex, destinationIndex);
        return true;
    }

    public bool CanMoveItemToSectionEnd(
        MenuCustomizationItemViewModel item,
        string placement)
        => ReferenceEquals(item.Owner, this)
            && string.Equals(
                item.Placement,
                MenuCustomizationPlacement.Normalize(placement),
                StringComparison.Ordinal);

    public void MoveItemToSectionEnd(
        MenuCustomizationItemViewModel item,
        string placement)
    {
        if (!CanMoveItemToSectionEnd(item, placement))
            return;

        ObservableCollection<MenuCustomizationItemViewModel> collection =
            GetCollection(item.Placement);
        int sourceIndex = collection.IndexOf(item);
        int destinationIndex = collection.Count - 1;

        if (sourceIndex >= 0 && sourceIndex != destinationIndex)
        {
            collection.Move(sourceIndex, destinationIndex);
        }
    }

    internal void ChangePlacement(
        MenuCustomizationItemViewModel item,
        string requestedPlacement)
    {
        if (!ReferenceEquals(item.Owner, this))
            return;

        string nextPlacement = MenuCustomizationPlacement.Normalize(
            requestedPlacement,
            item.Placement);

        if (string.Equals(item.Placement, nextPlacement, StringComparison.Ordinal))
            return;

        ObservableCollection<MenuCustomizationItemViewModel> sourceCollection =
            GetCollection(item.Placement);
        ObservableCollection<MenuCustomizationItemViewModel> targetCollection =
            GetCollection(nextPlacement);

        if (!sourceCollection.Remove(item))
            return;

        item.SetPlacement(nextPlacement);
        targetCollection.Add(item);
    }

    public override void RefreshLocalization()
    {
        base.RefreshLocalization();
        OnPropertyChanged(nameof(VisibleSectionTitle));
        OnPropertyChanged(nameof(OverflowSectionTitle));
        OnPropertyChanged(nameof(DisabledSectionTitle));

        foreach (MenuCustomizationItemViewModel item in VisibleItems
            .Concat(OverflowItems)
            .Concat(DisabledItems))
        {
            item.RefreshLocalization();
        }
    }

    internal string Translate(string key, string fallback)
        => LocalizationService.Translate(key, fallback, Settings.AppLanguage);

    private ObservableCollection<MenuCustomizationItemViewModel> GetCollection(
        string placement)
        => MenuCustomizationPlacement.Normalize(placement) switch
        {
            MenuCustomizationPlacement.Overflow => OverflowItems,
            MenuCustomizationPlacement.Disabled => DisabledItems,
            _ => VisibleItems,
        };
}

public sealed class MenuCustomizationItemViewModel : BaseViewModel
{
    private readonly MenuCustomizationDefinition _definition;
    private string _placement;

    internal MenuCustomizationItemViewModel(
        MenuCustomizationSettingsPageViewModel owner,
        MenuCustomizationDefinition definition,
        string placement)
    {
        Owner = owner;
        _definition = definition;
        _placement = MenuCustomizationPlacement.Normalize(
            placement,
            definition.DefaultPlacement);
    }

    internal MenuCustomizationSettingsPageViewModel Owner { get; }

    public string Id => _definition.Id;

    public IReadOnlyList<string> PlacementOptions => MenuCustomizationPlacement.Options;

    public string Placement
    {
        get => _placement;
        set => Owner.ChangePlacement(this, value);
    }

    public string Title => Owner.Translate(
        _definition.TitleKey,
        _definition.FallbackTitle);

    internal void SetPlacement(string placement)
        => SetProperty(ref _placement, placement, nameof(Placement));

    internal void RefreshLocalization()
        => OnPropertyChanged(nameof(Title));
}
