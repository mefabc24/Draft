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
                settings,
                GetCategoryTitleKey(category.Title),
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

    public void RefreshShortcutConflicts()
    {
        foreach (ShortcutItemViewModel shortcut in _shortcuts)
        {
            shortcut.RefreshConflict();
        }
    }

    public override void RefreshLocalization()
    {
        base.RefreshLocalization();

        foreach (ShortcutCategoryViewModel category in Categories)
        {
            category.RefreshLocalization();
        }

        foreach (ShortcutItemViewModel shortcut in _shortcuts)
        {
            shortcut.RefreshLocalization();
        }
    }

    private static string GetCategoryTitleKey(string title)
    {
        return title switch
        {
            "GENERAL" => "shortcuts.categories.general",
            "FLOATING MARKDOWN TOOLBAR" => "shortcuts.categories.floatingMarkdownToolbar",
            "QUICK INSERT MENU" => "shortcuts.categories.quickInsertMenu",
            _ => title,
        };
    }
}

public sealed class ShortcutCategoryViewModel : BaseViewModel
{
    private readonly string _fallbackTitle;
    private readonly SettingsWindowViewModel _settings;
    private readonly string _titleKey;

    public ShortcutCategoryViewModel(
        SettingsWindowViewModel settings,
        string titleKey,
        string fallbackTitle,
        IReadOnlyList<ShortcutItemViewModel> shortcuts)
    {
        _settings = settings;
        _titleKey = titleKey;
        _fallbackTitle = fallbackTitle;
        Shortcuts = shortcuts;
    }

    public string Title =>
        LocalizationService.Translate(_titleKey, _fallbackTitle, _settings.AppLanguage);

    public IReadOnlyList<ShortcutItemViewModel> Shortcuts { get; }

    public void RefreshLocalization()
    {
        OnPropertyChanged(nameof(Title));
    }
}

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

    public string Title => LocalizationService.Translate(
        $"shortcuts.actions.{_definition.Id}.title",
        _definition.Title,
        _settings.AppLanguage);

    public string Description => LocalizationService.Translate(
        $"shortcuts.actions.{_definition.Id}.description",
        _definition.Description,
        _settings.AppLanguage);

    public string DefaultShortcut => _definition.DefaultShortcut;

    public bool IsEditable => _definition.IsEditable;

    public bool HasConflict => Conflict is not null;

    public string ConflictMessage
    {
        get
        {
            ShortcutConflict? conflict = Conflict;
            if (conflict is null)
                return string.Empty;

            string conflictingActionId = conflict.GetOtherActionId(_definition.Id);
            ShortcutActionDefinition? conflictingAction = ShortcutSettingsCatalog.Actions
                .FirstOrDefault(action => string.Equals(
                    action.Id,
                    conflictingActionId,
                    StringComparison.Ordinal));
            string conflictingTitle = conflictingAction is null
                ? conflictingActionId
                : LocalizationService.Translate(
                    $"shortcuts.actions.{conflictingAction.Id}.title",
                    conflictingAction.Title,
                    _settings.AppLanguage);

            return LocalizationService.TranslateFormat(
                "shortcuts.conflict",
                "{shortcut} is already used by “{command}”.",
                new Dictionary<string, string>
                {
                    ["shortcut"] = FormatEffectiveShortcut(conflict),
                    ["command"] = conflictingTitle,
                },
                _settings.AppLanguage);
        }
    }

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

    public void RefreshConflict()
    {
        OnPropertyChanged(nameof(HasConflict));
        OnPropertyChanged(nameof(ConflictMessage));
    }

    public void RefreshLocalization()
    {
        OnPropertyChanged(nameof(Title));
        OnPropertyChanged(nameof(Description));
        OnPropertyChanged(nameof(ConflictMessage));
    }

    private ShortcutConflict? Conflict => _settings.GetShortcutConflict(_definition.Id);

    private string FormatEffectiveShortcut(ShortcutConflict conflict)
    {
        ShortcutMouseGestureIdentity? mouseGesture = conflict.Identity.MouseGesture;
        if (mouseGesture is null)
            return conflict.KeyboardDisplay;

        string gestureDisplay = mouseGesture.Kind == ShortcutMouseGestureKind.Wheel
            ? FormatWheelGesture(mouseGesture.WheelDirection)
            : FormatPointerGesture(mouseGesture.Button, mouseGesture.Kind);

        return $"{conflict.KeyboardDisplay} + {gestureDisplay}";
    }

    private string FormatPointerGesture(
        ShortcutMouseButton button,
        ShortcutMouseGestureKind gesture)
    {
        string buttonLabel = button switch
        {
            ShortcutMouseButton.Left => Translate("shortcuts.mouse.left", "Left"),
            ShortcutMouseButton.Middle => Translate("shortcuts.mouse.middle", "Middle"),
            ShortcutMouseButton.Right => Translate("shortcuts.mouse.right", "Right"),
            _ => Translate("shortcuts.mouse.mouse", "Mouse"),
        };
        string gestureLabel = gesture switch
        {
            ShortcutMouseGestureKind.Click => Translate("shortcuts.mouse.click", "Click"),
            ShortcutMouseGestureKind.DoubleClick => Translate(
                "shortcuts.mouse.doubleClick",
                "Double-click"),
            ShortcutMouseGestureKind.Drag => Translate("shortcuts.mouse.drag", "Drag"),
            _ => string.Empty,
        };

        return LocalizationService.TranslateFormat(
            "shortcuts.mouse.pointerFormat",
            "{button} {gesture}",
            new Dictionary<string, string>
            {
                ["button"] = buttonLabel,
                ["gesture"] = gestureLabel,
            },
            _settings.AppLanguage);
    }

    private string FormatWheelGesture(ShortcutMouseWheelDirection direction)
    {
        string directionLabel = direction switch
        {
            ShortcutMouseWheelDirection.Up => Translate("shortcuts.mouse.up", "Up"),
            ShortcutMouseWheelDirection.Down => Translate("shortcuts.mouse.down", "Down"),
            _ => string.Empty,
        };

        return LocalizationService.TranslateFormat(
            "shortcuts.mouse.wheelFormat",
            "Mouse Wheel {direction}",
            new Dictionary<string, string> { ["direction"] = directionLabel },
            _settings.AppLanguage);
    }

    private string Translate(string key, string fallback)
    {
        return LocalizationService.Translate(key, fallback, _settings.AppLanguage);
    }
}
