namespace Draft.Settings.Models;

public static class MenuCustomizationPlacement
{
    public const string Visible = "Visible";
    public const string Overflow = "Overflow";
    public const string Disabled = "Disabled";

    public static IReadOnlyList<string> Options { get; } =
        new[] { Visible, Overflow, Disabled };

    public static bool IsValid(string? placement)
        => placement is not null
            && Options.Contains(placement, StringComparer.OrdinalIgnoreCase);

    public static string Normalize(string? placement, string fallback = Visible)
    {
        if (string.Equals(placement, Visible, StringComparison.OrdinalIgnoreCase))
            return Visible;

        if (string.Equals(placement, Overflow, StringComparison.OrdinalIgnoreCase))
            return Overflow;

        if (string.Equals(placement, Disabled, StringComparison.OrdinalIgnoreCase))
            return Disabled;

        return IsValid(fallback)
            ? Normalize(fallback)
            : Visible;
    }
}

public sealed class MenuItemCustomization
{
    public MenuItemCustomization()
    {
    }

    public MenuItemCustomization(string id, string placement)
    {
        Id = id;
        Placement = placement;
    }

    public string Id { get; set; } = string.Empty;

    public string Placement { get; set; } = MenuCustomizationPlacement.Visible;
}

public sealed record MenuCustomizationDefinition(
    string Id,
    string TitleKey,
    string FallbackTitle,
    string DefaultPlacement);

public static class MenuCustomizationCatalog
{
    public static IReadOnlyList<MenuCustomizationDefinition> FloatingMarkdownToolbarDefinitions { get; } =
        new[]
        {
            DefineFmt("heading", "Text Styles", MenuCustomizationPlacement.Visible),
            DefineFmt("bold", "Bold", MenuCustomizationPlacement.Visible),
            DefineFmt("italic", "Italic", MenuCustomizationPlacement.Visible),
            DefineFmt("underline", "Underline", MenuCustomizationPlacement.Visible),
            DefineFmt("strikethrough", "Strikethrough", MenuCustomizationPlacement.Visible),
            DefineFmt("code", "Inline Code", MenuCustomizationPlacement.Visible),
            DefineFmt("link", "Link", MenuCustomizationPlacement.Visible),
            DefineFmt("image", "Image", MenuCustomizationPlacement.Visible),
            DefineFmt("list", "List Styles", MenuCustomizationPlacement.Visible),
            DefineFmt("comment", "Comment", MenuCustomizationPlacement.Overflow),
            DefineFmt("spoiler", "Spoiler", MenuCustomizationPlacement.Overflow),
            DefineFmt("highlight", "Highlight", MenuCustomizationPlacement.Overflow),
            DefineFmt("badge", "Badge", MenuCustomizationPlacement.Overflow),
            DefineFmt("uppercase", "Uppercase", MenuCustomizationPlacement.Overflow),
            DefineFmt("lowercase", "Lowercase", MenuCustomizationPlacement.Overflow),
        };

    public static IReadOnlyList<MenuCustomizationDefinition> QuickInsertMenuDefinitions { get; } =
        new[]
        {
            DefineQuickInsert("lists", "Lists", MenuCustomizationPlacement.Visible),
            DefineQuickInsert("headings", "Headings", MenuCustomizationPlacement.Visible),
            DefineQuickInsert("link", "Link", MenuCustomizationPlacement.Visible),
            DefineQuickInsert("blockquote", "Blockquote", MenuCustomizationPlacement.Visible),
            DefineQuickInsert("table", "Table", MenuCustomizationPlacement.Visible),
            DefineQuickInsert("codeblocks", "Codeblocks", MenuCustomizationPlacement.Visible),
            DefineQuickInsert("image", "Image", MenuCustomizationPlacement.Overflow),
            DefineQuickInsert("keyboard", "Keyboard", MenuCustomizationPlacement.Overflow),
            DefineQuickInsert("expander", "Expander", MenuCustomizationPlacement.Overflow),
            DefineQuickInsert("tag", "Tag", MenuCustomizationPlacement.Overflow),
            DefineQuickInsert("callouts", "Callouts", MenuCustomizationPlacement.Overflow),
            DefineQuickInsert("miscellaneous", "Miscellaneous", MenuCustomizationPlacement.Overflow),
        };

    public static List<MenuItemCustomization> CreateDefaultFloatingMarkdownToolbarItems()
        => CreateDefaults(FloatingMarkdownToolbarDefinitions);

    public static List<MenuItemCustomization> CreateDefaultQuickInsertMenuItems()
        => CreateDefaults(QuickInsertMenuDefinitions);

    public static List<MenuItemCustomization> NormalizeFloatingMarkdownToolbarItems(
        IEnumerable<MenuItemCustomization>? items)
        => NormalizeItems(items, FloatingMarkdownToolbarDefinitions);

    public static List<MenuItemCustomization> NormalizeQuickInsertMenuItems(
        IEnumerable<MenuItemCustomization>? items)
        => NormalizeItems(items, QuickInsertMenuDefinitions);

    public static List<MenuItemCustomization> CloneItems(
        IEnumerable<MenuItemCustomization>? items)
    {
        if (items is null)
            return new List<MenuItemCustomization>();

        return items
            .Where(item => item is not null)
            .Select(item => new MenuItemCustomization(item.Id, item.Placement))
            .ToList();
    }

    private static MenuCustomizationDefinition DefineFmt(
        string id,
        string fallbackTitle,
        string defaultPlacement)
        => new(
            id,
            $"settings.floatingMarkdownToolbar.items.{id}",
            fallbackTitle,
            defaultPlacement);

    private static MenuCustomizationDefinition DefineQuickInsert(
        string id,
        string fallbackTitle,
        string defaultPlacement)
        => new(
            id,
            $"settings.quickInsertMenu.items.{id}",
            fallbackTitle,
            defaultPlacement);

    private static List<MenuItemCustomization> CreateDefaults(
        IReadOnlyList<MenuCustomizationDefinition> definitions)
        => definitions
            .Select(definition => new MenuItemCustomization(
                definition.Id,
                definition.DefaultPlacement))
            .ToList();

    private static List<MenuItemCustomization> NormalizeItems(
        IEnumerable<MenuItemCustomization>? items,
        IReadOnlyList<MenuCustomizationDefinition> definitions)
    {
        Dictionary<string, MenuCustomizationDefinition> definitionsById =
            definitions.ToDictionary(definition => definition.Id, StringComparer.OrdinalIgnoreCase);
        HashSet<string> seenIds = new(StringComparer.OrdinalIgnoreCase);
        List<MenuItemCustomization> normalizedItems = new(definitions.Count);

        if (items is not null)
        {
            foreach (MenuItemCustomization? item in items)
            {
                if (item is null
                    || string.IsNullOrWhiteSpace(item.Id)
                    || !definitionsById.TryGetValue(item.Id.Trim(), out MenuCustomizationDefinition? definition)
                    || !seenIds.Add(definition.Id))
                {
                    continue;
                }

                normalizedItems.Add(new MenuItemCustomization(
                    definition.Id,
                    MenuCustomizationPlacement.Normalize(
                        item.Placement,
                        definition.DefaultPlacement)));
            }
        }

        foreach (MenuCustomizationDefinition definition in definitions)
        {
            if (!seenIds.Add(definition.Id))
                continue;

            normalizedItems.Add(new MenuItemCustomization(
                definition.Id,
                definition.DefaultPlacement));
        }

        return normalizedItems;
    }
}
