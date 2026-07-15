namespace Draft.Settings.Shortcuts;

[Flags]
public enum ShortcutModifierKeys
{
    None = 0,
    Control = 1,
    Shift = 2,
    Alt = 4,
    Windows = 8,
}

public enum ShortcutScope
{
    Global,
    EditorTextInput,
    ToolbarOverlay,
}

public enum ShortcutMouseButton
{
    None,
    Left,
    Middle,
    Right,
}

public enum ShortcutMouseGestureKind
{
    Click,
    DoubleClick,
    Drag,
    Wheel,
}

public enum ShortcutMouseWheelDirection
{
    None,
    Up,
    Down,
}

public sealed record ShortcutKeyboardIdentity(
    ShortcutModifierKeys Modifiers,
    string KeySignature);

public sealed record ShortcutMouseGestureIdentity(
    ShortcutMouseGestureKind Kind,
    ShortcutMouseButton Button = ShortcutMouseButton.None,
    ShortcutMouseWheelDirection WheelDirection = ShortcutMouseWheelDirection.None)
{
    public int ClickCount => Kind switch
    {
        ShortcutMouseGestureKind.Click => 1,
        ShortcutMouseGestureKind.DoubleClick => 2,
        _ => 0,
    };

    public bool IsDrag => Kind == ShortcutMouseGestureKind.Drag;
}

public sealed record ShortcutIdentity(
    ShortcutKeyboardIdentity Keyboard,
    ShortcutMouseGestureIdentity? MouseGesture);
