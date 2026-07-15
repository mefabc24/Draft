using System.Text;

namespace Draft.Settings.Shortcuts;

public static class ShortcutNormalizer
{
    private static readonly (ShortcutModifierKeys Modifier, string DisplayName)[] ModifierOrder =
    {
        (ShortcutModifierKeys.Control, "Ctrl"),
        (ShortcutModifierKeys.Shift, "Shift"),
        (ShortcutModifierKeys.Alt, "Alt"),
        (ShortcutModifierKeys.Windows, "Win"),
    };

    public static bool TryNormalizeKeyboardShortcut(
        string shortcut,
        bool allowModifierOnly,
        bool removeLegacyMouseGestures,
        out string normalizedShortcut,
        out ShortcutKeyboardIdentity identity)
    {
        normalizedShortcut = string.Empty;
        identity = new ShortcutKeyboardIdentity(ShortcutModifierKeys.None, string.Empty);

        if (string.IsNullOrWhiteSpace(shortcut))
            return false;

        ShortcutModifierKeys modifiers = ShortcutModifierKeys.None;
        Dictionary<string, string> keys = new(StringComparer.Ordinal);

        foreach (string part in SplitShortcutParts(shortcut))
        {
            if (removeLegacyMouseGestures && IsLegacyMouseGesturePart(part))
                continue;

            if (TryNormalizeModifier(part, out ShortcutModifierKeys modifier))
            {
                modifiers |= modifier;
                continue;
            }

            (string keyIdentity, string displayName) = NormalizeKey(part);
            if (!string.IsNullOrWhiteSpace(keyIdentity))
                keys.TryAdd(keyIdentity, displayName);
        }

        if (keys.Count == 0 && (!allowModifierOnly || modifiers == ShortcutModifierKeys.None))
            return false;

        string[] orderedKeyIdentities = keys.Keys
            .Order(StringComparer.Ordinal)
            .ToArray();
        IEnumerable<string> displayParts = ModifierOrder
            .Where(entry => modifiers.HasFlag(entry.Modifier))
            .Select(entry => entry.DisplayName)
            .Concat(orderedKeyIdentities.Select(key => keys[key]));

        normalizedShortcut = string.Join(" + ", displayParts);
        identity = new ShortcutKeyboardIdentity(
            modifiers,
            string.Join("\u001F", orderedKeyIdentities));
        return true;
    }

    private static bool TryNormalizeModifier(
        string part,
        out ShortcutModifierKeys modifier)
    {
        modifier = part.Trim().ToUpperInvariant() switch
        {
            "CMD" or "COMMAND" or "CONTROL" or "CTRL" => ShortcutModifierKeys.Control,
            "SHIFT" => ShortcutModifierKeys.Shift,
            "ALT" or "OPTION" => ShortcutModifierKeys.Alt,
            "WIN" or "WINDOWS" => ShortcutModifierKeys.Windows,
            _ => ShortcutModifierKeys.None,
        };

        return modifier != ShortcutModifierKeys.None;
    }

    private static (string Identity, string DisplayName) NormalizeKey(string part)
    {
        string trimmedPart = part.Trim();
        string lowerPart = CollapseWhitespace(trimmedPart).ToLowerInvariant();
        string compactPart = new(lowerPart.Where(char.IsLetterOrDigit).ToArray());

        if (lowerPart is "num +" or "numpad +")
            return ("num+", "Num +");
        if (lowerPart is "num -" or "numpad -")
            return ("num-", "Num -");
        if (lowerPart is "num *" or "numpad *")
            return ("num*", "Num *");
        if (lowerPart is "num /" or "numpad /")
            return ("num/", "Num /");
        if (lowerPart is "num ." or "numpad .")
            return ("num.", "Num .");

        if (compactPart.Length == 1 && char.IsLetterOrDigit(compactPart[0]))
        {
            return (
                compactPart,
                char.IsLetter(compactPart[0])
                    ? compactPart.ToUpperInvariant()
                    : compactPart);
        }

        if (compactPart.Length == 2
            && compactPart[0] == 'f'
            && char.IsDigit(compactPart[1]))
        {
            return (compactPart, compactPart.ToUpperInvariant());
        }

        if (compactPart.Length == 3
            && compactPart[0] == 'f'
            && int.TryParse(compactPart[1..], out int functionKey)
            && functionKey is >= 10 and <= 24)
        {
            return (compactPart, compactPart.ToUpperInvariant());
        }

        if (compactPart.Length == 4
            && compactPart.StartsWith("key", StringComparison.Ordinal)
            && char.IsLetter(compactPart[3]))
        {
            string key = compactPart[3].ToString();
            return (key, key.ToUpperInvariant());
        }

        if (compactPart.Length == 6
            && compactPart.StartsWith("digit", StringComparison.Ordinal)
            && char.IsDigit(compactPart[5]))
        {
            string key = compactPart[5].ToString();
            return (key, key);
        }

        return compactPart switch
        {
            "arrowdown" or "down" => ("down", "Down"),
            "arrowleft" or "left" => ("left", "Left"),
            "arrowright" or "right" => ("right", "Right"),
            "arrowup" or "up" => ("up", "Up"),
            "back" or "backspace" => ("backspace", "Backspace"),
            "capslock" => ("capslock", "Caps Lock"),
            "del" or "delete" => ("delete", "Delete"),
            "end" => ("end", "End"),
            "enter" or "return" => ("enter", "Enter"),
            "esc" or "escape" => ("esc", "Esc"),
            "home" => ("home", "Home"),
            "insert" => ("insert", "Insert"),
            "menu" or "apps" => ("menu", "Menu"),
            "pagedown" => ("pagedown", "Page Down"),
            "pageup" => ("pageup", "Page Up"),
            "space" or "spacebar" => ("space", "Space"),
            "tab" => ("tab", "Tab"),
            "numpadadd" or "numadd" => ("num+", "Num +"),
            "numpadsubtract" or "numsubtract" => ("num-", "Num -"),
            "numpadmultiply" or "nummultiply" => ("num*", "Num *"),
            "numpaddivide" or "numdivide" => ("num/", "Num /"),
            "numpaddecimal" or "numdecimal" => ("num.", "Num ."),
            _ when compactPart.StartsWith("numpad", StringComparison.Ordinal)
                && compactPart.Length == 7
                && char.IsDigit(compactPart[6]) =>
                    ($"num{compactPart[6]}", $"Num {compactPart[6]}"),
            _ when compactPart.StartsWith("num", StringComparison.Ordinal)
                && compactPart.Length == 4
                && char.IsDigit(compactPart[3]) =>
                    ($"num{compactPart[3]}", $"Num {compactPart[3]}"),
            _ => (lowerPart, GetFallbackDisplayName(trimmedPart, lowerPart)),
        };
    }

    private static string GetFallbackDisplayName(string original, string normalized)
    {
        if (normalized.Length == 1)
            return normalized.ToUpperInvariant();

        return original.Length == 0
            ? normalized
            : original;
    }

    private static string CollapseWhitespace(string value)
    {
        StringBuilder builder = new();
        bool previousWasWhitespace = false;

        foreach (char character in value)
        {
            if (char.IsWhiteSpace(character))
            {
                if (!previousWasWhitespace)
                    builder.Append(' ');

                previousWasWhitespace = true;
                continue;
            }

            builder.Append(character);
            previousWasWhitespace = false;
        }

        return builder.ToString().Trim();
    }

    private static bool IsLegacyMouseGesturePart(string part)
    {
        string normalizedPart = new(part
            .Where(char.IsLetterOrDigit)
            .Select(char.ToLowerInvariant)
            .ToArray());

        return normalizedPart is "click"
            or "doubleclick"
            or "leftclick"
            or "rightclick"
            or "middleclick"
            or "mouseclick"
            or "mousedrag"
            or "leftdrag"
            or "rightdrag"
            or "middledrag"
            or "leftdoubleclick"
            or "rightdoubleclick"
            or "middledoubleclick"
            or "mousewheelup"
            or "mousewheeldown"
            or "wheelup"
            or "wheeldown";
    }

    private static IEnumerable<string> SplitShortcutParts(string shortcut)
    {
        string trimmedShortcut = shortcut.Trim();

        if (trimmedShortcut.Contains(" + ", StringComparison.Ordinal))
        {
            return trimmedShortcut
                .Split(" + ", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        }

        return trimmedShortcut
            .Split('+', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }
}
