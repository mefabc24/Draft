namespace Draft.Settings.Shortcuts;

public sealed record ShortcutConflict(
    string FirstActionId,
    string SecondActionId,
    ShortcutIdentity Identity,
    string KeyboardDisplay)
{
    public string GetOtherActionId(string actionId)
    {
        return string.Equals(actionId, FirstActionId, StringComparison.Ordinal)
            ? SecondActionId
            : FirstActionId;
    }
}

public static class ShortcutConflictDetector
{
    public static IReadOnlyList<ShortcutConflict> FindConflicts(
        IReadOnlyDictionary<string, string>? shortcuts,
        IReadOnlyList<ShortcutActionDefinition>? definitions = null)
    {
        IReadOnlyList<ShortcutActionDefinition> actions =
            definitions ?? ShortcutSettingsCatalog.Actions;
        List<EffectiveShortcut> effectiveShortcuts = actions
            .SelectMany(action => CreateEffectiveShortcuts(action, shortcuts))
            .ToList();
        List<ShortcutConflict> conflicts = new();

        for (int firstIndex = 0; firstIndex < effectiveShortcuts.Count; firstIndex++)
        {
            EffectiveShortcut first = effectiveShortcuts[firstIndex];

            for (int secondIndex = firstIndex + 1; secondIndex < effectiveShortcuts.Count; secondIndex++)
            {
                EffectiveShortcut second = effectiveShortcuts[secondIndex];

                if (string.Equals(first.ActionId, second.ActionId, StringComparison.Ordinal)
                    || !ScopesOverlap(first.Scope, second.Scope)
                    || first.Identity != second.Identity)
                {
                    continue;
                }

                ShortcutConflict conflict = new(
                    first.ActionId,
                    second.ActionId,
                    first.Identity,
                    first.KeyboardDisplay);

                if (!conflicts.Contains(conflict))
                    conflicts.Add(conflict);
            }
        }

        return conflicts;
    }

    public static bool HasConflicts(
        IReadOnlyDictionary<string, string>? shortcuts,
        IReadOnlyList<ShortcutActionDefinition>? definitions = null)
    {
        return FindConflicts(shortcuts, definitions).Count > 0;
    }

    private static IEnumerable<EffectiveShortcut> CreateEffectiveShortcuts(
        ShortcutActionDefinition action,
        IReadOnlyDictionary<string, string>? shortcuts)
    {
        string shortcut = shortcuts is not null
            && shortcuts.TryGetValue(action.Id, out string? configuredShortcut)
                ? configuredShortcut
                : action.DefaultShortcut;
        bool hasFixedMouseGesture = action.FixedMouseGesture != ShortcutFixedMouseGesture.None;

        if (!ShortcutNormalizer.TryNormalizeKeyboardShortcut(
            shortcut,
            allowModifierOnly: hasFixedMouseGesture,
            removeLegacyMouseGestures: hasFixedMouseGesture,
            out string normalizedShortcut,
            out ShortcutKeyboardIdentity keyboardIdentity))
        {
            yield break;
        }

        IReadOnlyList<ShortcutMouseGestureIdentity> mouseGestures =
            GetMouseGestureIdentities(action.FixedMouseGesture);

        if (mouseGestures.Count == 0)
        {
            yield return new EffectiveShortcut(
                action.Id,
                action.Scope,
                new ShortcutIdentity(keyboardIdentity, null),
                normalizedShortcut);
            yield break;
        }

        foreach (ShortcutMouseGestureIdentity mouseGesture in mouseGestures)
        {
            yield return new EffectiveShortcut(
                action.Id,
                action.Scope,
                new ShortcutIdentity(keyboardIdentity, mouseGesture),
                normalizedShortcut);
        }
    }

    private static IReadOnlyList<ShortcutMouseGestureIdentity> GetMouseGestureIdentities(
        ShortcutFixedMouseGesture fixedMouseGesture)
    {
        return fixedMouseGesture switch
        {
            ShortcutFixedMouseGesture.None => Array.Empty<ShortcutMouseGestureIdentity>(),
            ShortcutFixedMouseGesture.LeftClick =>
                new[] { Pointer(ShortcutMouseGestureKind.Click, ShortcutMouseButton.Left) },
            ShortcutFixedMouseGesture.MiddleClick =>
                new[] { Pointer(ShortcutMouseGestureKind.Click, ShortcutMouseButton.Middle) },
            ShortcutFixedMouseGesture.RightClick =>
                new[] { Pointer(ShortcutMouseGestureKind.Click, ShortcutMouseButton.Right) },
            ShortcutFixedMouseGesture.LeftDoubleClick =>
                new[] { Pointer(ShortcutMouseGestureKind.DoubleClick, ShortcutMouseButton.Left) },
            ShortcutFixedMouseGesture.MiddleDoubleClick =>
                new[] { Pointer(ShortcutMouseGestureKind.DoubleClick, ShortcutMouseButton.Middle) },
            ShortcutFixedMouseGesture.RightDoubleClick =>
                new[] { Pointer(ShortcutMouseGestureKind.DoubleClick, ShortcutMouseButton.Right) },
            ShortcutFixedMouseGesture.LeftDrag =>
                new[] { Pointer(ShortcutMouseGestureKind.Drag, ShortcutMouseButton.Left) },
            ShortcutFixedMouseGesture.MiddleDrag =>
                new[] { Pointer(ShortcutMouseGestureKind.Drag, ShortcutMouseButton.Middle) },
            ShortcutFixedMouseGesture.RightDrag =>
                new[] { Pointer(ShortcutMouseGestureKind.Drag, ShortcutMouseButton.Right) },
            ShortcutFixedMouseGesture.WheelUp =>
                new[] { Wheel(ShortcutMouseWheelDirection.Up) },
            ShortcutFixedMouseGesture.WheelDown =>
                new[] { Wheel(ShortcutMouseWheelDirection.Down) },
            ShortcutFixedMouseGesture.LeftDragOrDoubleClick =>
                new[]
                {
                    Pointer(ShortcutMouseGestureKind.Drag, ShortcutMouseButton.Left),
                    Pointer(ShortcutMouseGestureKind.DoubleClick, ShortcutMouseButton.Left),
                },
            _ => Array.Empty<ShortcutMouseGestureIdentity>(),
        };
    }

    private static ShortcutMouseGestureIdentity Pointer(
        ShortcutMouseGestureKind kind,
        ShortcutMouseButton button)
    {
        return new ShortcutMouseGestureIdentity(kind, button);
    }

    private static ShortcutMouseGestureIdentity Wheel(
        ShortcutMouseWheelDirection direction)
    {
        return new ShortcutMouseGestureIdentity(
            ShortcutMouseGestureKind.Wheel,
            WheelDirection: direction);
    }

    private static bool ScopesOverlap(ShortcutScope first, ShortcutScope second)
    {
        return first == ShortcutScope.Global
            || second == ShortcutScope.Global
            || first == second;
    }

    private sealed record EffectiveShortcut(
        string ActionId,
        ShortcutScope Scope,
        ShortcutIdentity Identity,
        string KeyboardDisplay);
}
