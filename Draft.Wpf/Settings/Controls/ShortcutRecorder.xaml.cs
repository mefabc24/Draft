using System.Globalization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;

namespace Draft.Settings.Controls;

public partial class ShortcutRecorder : UserControl
{
    private static ShortcutRecorder? activeRecorder;

    private static readonly DependencyPropertyKey IsRecordingPropertyKey =
        DependencyProperty.RegisterReadOnly(
            nameof(IsRecording),
            typeof(bool),
            typeof(ShortcutRecorder),
            new PropertyMetadata(false));

    public static readonly DependencyProperty IsRecordingProperty =
        IsRecordingPropertyKey.DependencyProperty;

    public static readonly DependencyProperty ShortcutTextProperty =
        DependencyProperty.Register(
            nameof(ShortcutText),
            typeof(string),
            typeof(ShortcutRecorder),
            new FrameworkPropertyMetadata(
                string.Empty,
                FrameworkPropertyMetadataOptions.BindsTwoWayByDefault,
                OnShortcutTextChanged));

    public static readonly DependencyProperty ShortcutChangedCommandProperty =
        DependencyProperty.Register(
            nameof(ShortcutChangedCommand),
            typeof(ICommand),
            typeof(ShortcutRecorder),
            new PropertyMetadata(null));

    public static readonly DependencyProperty PlaceholderProperty =
        DependencyProperty.Register(
            nameof(Placeholder),
            typeof(string),
            typeof(ShortcutRecorder),
            new PropertyMetadata("Not set", OnPlaceholderChanged));

    public static readonly DependencyProperty DisplayTextProperty =
        DependencyProperty.Register(
            nameof(DisplayText),
            typeof(string),
            typeof(ShortcutRecorder),
            new PropertyMetadata(string.Empty));

    private readonly KeyEventHandler _previewKeyDownHandler;
    private readonly KeyEventHandler _previewKeyUpHandler;
    private readonly HashSet<Key> _pressedKeys = new();
    private readonly List<Key> _pressedKeyOrder = new();

    private Window? _recordingWindow;
    private string _pendingShortcutText = string.Empty;
    private bool _hasRecordedKey;

    public ShortcutRecorder()
    {
        InitializeComponent();

        _previewKeyDownHandler = OnRecordingPreviewKeyDown;
        _previewKeyUpHandler = OnRecordingPreviewKeyUp;

        Loaded += (_, _) => UpdateDisplayTextFromShortcut();
        Unloaded += (_, _) => StopRecording(commit: false);
        IsEnabledChanged += (_, _) =>
        {
            if (!IsEnabled)
                StopRecording(commit: false);
        };
    }

    public event EventHandler<ShortcutChangedEventArgs>? ShortcutChanged;

    public bool IsRecording
    {
        get => (bool)GetValue(IsRecordingProperty);
        private set => SetValue(IsRecordingPropertyKey, value);
    }

    public string ShortcutText
    {
        get => (string?)GetValue(ShortcutTextProperty) ?? string.Empty;
        set => SetValue(ShortcutTextProperty, value);
    }

    public ICommand? ShortcutChangedCommand
    {
        get => (ICommand?)GetValue(ShortcutChangedCommandProperty);
        set => SetValue(ShortcutChangedCommandProperty, value);
    }

    public string Placeholder
    {
        get => (string?)GetValue(PlaceholderProperty) ?? string.Empty;
        set => SetValue(PlaceholderProperty, value);
    }

    public string DisplayText
    {
        get => (string?)GetValue(DisplayTextProperty) ?? string.Empty;
        private set => SetValue(DisplayTextProperty, value);
    }

    private static void OnShortcutTextChanged(DependencyObject dependencyObject, DependencyPropertyChangedEventArgs e)
    {
        if (dependencyObject is ShortcutRecorder recorder && !recorder.IsRecording)
            recorder.UpdateDisplayTextFromShortcut();
    }

    private static void OnPlaceholderChanged(DependencyObject dependencyObject, DependencyPropertyChangedEventArgs e)
    {
        if (dependencyObject is ShortcutRecorder recorder && !recorder.IsRecording)
            recorder.UpdateDisplayTextFromShortcut();
    }

    private void RecordButton_Click(object sender, RoutedEventArgs e)
    {
        e.Handled = true;

        if (IsRecording)
        {
            StopRecording(commit: false);
            return;
        }

        StartRecording();
    }

    private void StartRecording()
    {
        if (IsRecording || !IsEnabled)
            return;

        if (activeRecorder is not null && !ReferenceEquals(activeRecorder, this))
            activeRecorder.StopRecording(commit: false);

        activeRecorder = this;

        _pressedKeys.Clear();
        _pressedKeyOrder.Clear();
        _pendingShortcutText = string.Empty;
        _hasRecordedKey = false;

        IsRecording = true;
        UpdateDisplayTextFromShortcut();

        Focus();
        Keyboard.Focus(this);
        AttachRecordingHandlers();
    }

    private void StopRecording(bool commit)
    {
        if (!IsRecording)
            return;

        string shortcutToCommit = _pendingShortcutText;

        DetachRecordingHandlers();
        _pressedKeys.Clear();
        _pressedKeyOrder.Clear();
        _pendingShortcutText = string.Empty;
        _hasRecordedKey = false;
        IsRecording = false;

        if (ReferenceEquals(activeRecorder, this))
            activeRecorder = null;

        if (commit && !string.IsNullOrWhiteSpace(shortcutToCommit))
        {
            ShortcutText = shortcutToCommit;
            ShortcutChanged?.Invoke(this, new ShortcutChangedEventArgs(shortcutToCommit));

            if (ShortcutChangedCommand?.CanExecute(shortcutToCommit) == true)
                ShortcutChangedCommand.Execute(shortcutToCommit);

            return;
        }

        UpdateDisplayTextFromShortcut();
    }

    private void AttachRecordingHandlers()
    {
        DetachRecordingHandlers();

        _recordingWindow = Window.GetWindow(this);
        if (_recordingWindow is null)
            return;

        _recordingWindow.AddHandler(Keyboard.PreviewKeyDownEvent, _previewKeyDownHandler, handledEventsToo: true);
        _recordingWindow.AddHandler(Keyboard.PreviewKeyUpEvent, _previewKeyUpHandler, handledEventsToo: true);
        _recordingWindow.Deactivated += RecordingWindow_Deactivated;
    }

    private void DetachRecordingHandlers()
    {
        if (_recordingWindow is null)
            return;

        _recordingWindow.RemoveHandler(Keyboard.PreviewKeyDownEvent, _previewKeyDownHandler);
        _recordingWindow.RemoveHandler(Keyboard.PreviewKeyUpEvent, _previewKeyUpHandler);
        _recordingWindow.Deactivated -= RecordingWindow_Deactivated;
        _recordingWindow = null;
    }

    private void RecordingWindow_Deactivated(object? sender, EventArgs e)
    {
        StopRecording(commit: false);
    }

    private void OnRecordingPreviewKeyDown(object sender, KeyEventArgs e)
    {
        if (!IsRecording)
            return;

        e.Handled = true;

        Key key = GetEventKey(e);
        if (ShouldIgnoreKey(key))
            return;

        AddCurrentModifierKeys();
        AddPressedKey(key);
        UpdatePendingShortcutText();
    }

    private void OnRecordingPreviewKeyUp(object sender, KeyEventArgs e)
    {
        if (!IsRecording)
            return;

        e.Handled = true;

        Key key = GetEventKey(e);
        if (!ShouldIgnoreKey(key))
            RemovePressedKey(key);

        RemoveReleasedModifierKeys();

        if (_hasRecordedKey && _pressedKeys.Count == 0)
            StopRecording(commit: true);
    }

    private void AddCurrentModifierKeys()
    {
        ModifierKeys modifiers = Keyboard.Modifiers;

        if (modifiers.HasFlag(ModifierKeys.Control))
            AddPressedKey(Key.LeftCtrl);
        if (modifiers.HasFlag(ModifierKeys.Shift))
            AddPressedKey(Key.LeftShift);
        if (modifiers.HasFlag(ModifierKeys.Alt))
            AddPressedKey(Key.LeftAlt);
        if (modifiers.HasFlag(ModifierKeys.Windows))
            AddPressedKey(Key.LWin);
    }

    private void RemoveReleasedModifierKeys()
    {
        ModifierKeys modifiers = Keyboard.Modifiers;

        if (!modifiers.HasFlag(ModifierKeys.Control))
            RemovePressedKey(Key.LeftCtrl);
        if (!modifiers.HasFlag(ModifierKeys.Shift))
            RemovePressedKey(Key.LeftShift);
        if (!modifiers.HasFlag(ModifierKeys.Alt))
            RemovePressedKey(Key.LeftAlt);
        if (!modifiers.HasFlag(ModifierKeys.Windows))
            RemovePressedKey(Key.LWin);
    }

    private void AddPressedKey(Key key)
    {
        key = NormalizeModifierKey(key);

        if (_pressedKeys.Add(key))
            _pressedKeyOrder.Add(key);
    }

    private void RemovePressedKey(Key key)
    {
        key = NormalizeModifierKey(key);

        _pressedKeys.Remove(key);
        _pressedKeyOrder.RemoveAll(pressedKey => pressedKey == key);
    }

    private void UpdatePendingShortcutText()
    {
        string shortcut = FormatShortcut(_pressedKeyOrder);
        if (string.IsNullOrWhiteSpace(shortcut))
            return;

        _pendingShortcutText = shortcut;
        _hasRecordedKey = true;
        DisplayText = shortcut;
    }

    private void UpdateDisplayTextFromShortcut()
    {
        DisplayText = string.IsNullOrWhiteSpace(ShortcutText)
            ? Placeholder
            : ShortcutText;
    }

    private static string FormatShortcut(IReadOnlyList<Key> keys)
    {
        List<string> parts = new();

        if (keys.Contains(Key.LeftCtrl))
            parts.Add("Ctrl");
        if (keys.Contains(Key.LeftShift))
            parts.Add("Shift");
        if (keys.Contains(Key.LeftAlt))
            parts.Add("Alt");
        if (keys.Contains(Key.LWin))
            parts.Add("Win");

        foreach (Key key in keys)
        {
            if (IsModifierKey(key))
                continue;

            string keyName = FormatKeyName(key);
            if (!string.IsNullOrWhiteSpace(keyName) && !parts.Contains(keyName))
                parts.Add(keyName);
        }

        return string.Join(" + ", parts);
    }

    private static Key GetEventKey(KeyEventArgs e)
    {
        Key key = e.Key;

        if (key == Key.System && e.SystemKey != Key.None)
            key = e.SystemKey;
        else if (key == Key.ImeProcessed && e.ImeProcessedKey != Key.None)
            key = e.ImeProcessedKey;
        else if (key == Key.DeadCharProcessed && e.DeadCharProcessedKey != Key.None)
            key = e.DeadCharProcessedKey;

        return NormalizeModifierKey(key);
    }

    private static Key NormalizeModifierKey(Key key)
    {
        return key switch
        {
            Key.RightCtrl => Key.LeftCtrl,
            Key.RightShift => Key.LeftShift,
            Key.RightAlt => Key.LeftAlt,
            Key.RWin => Key.LWin,
            _ => key,
        };
    }

    private static bool ShouldIgnoreKey(Key key)
    {
        return key is Key.None or Key.System or Key.ImeProcessed or Key.DeadCharProcessed;
    }

    private static bool IsModifierKey(Key key)
    {
        return NormalizeModifierKey(key) is Key.LeftCtrl or Key.LeftShift or Key.LeftAlt or Key.LWin;
    }

    private static string FormatKeyName(Key key)
    {
        key = NormalizeModifierKey(key);

        if (key >= Key.A && key <= Key.Z)
            return key.ToString();

        if (key >= Key.D0 && key <= Key.D9)
            return ((int)key - (int)Key.D0).ToString(CultureInfo.InvariantCulture);

        if (key >= Key.NumPad0 && key <= Key.NumPad9)
            return $"Num {((int)key - (int)Key.NumPad0).ToString(CultureInfo.InvariantCulture)}";

        if (key >= Key.F1 && key <= Key.F24)
            return key.ToString();

        return key switch
        {
            Key.Return => "Enter",
            Key.Escape => "Esc",
            Key.Space => "Space",
            Key.Back => "Backspace",
            Key.Delete => "Delete",
            Key.Tab => "Tab",
            Key.Left => "Left",
            Key.Right => "Right",
            Key.Up => "Up",
            Key.Down => "Down",
            Key.Home => "Home",
            Key.End => "End",
            Key.Insert => "Insert",
            Key.PageUp => "Page Up",
            Key.PageDown => "Page Down",
            Key.CapsLock => "Caps Lock",
            Key.OemPlus => "+",
            Key.OemMinus => "-",
            Key.OemComma => ",",
            Key.OemPeriod => ".",
            Key.OemQuestion => "/",
            Key.OemBackslash => "\\",
            Key.OemPipe => "\\",
            Key.OemOpenBrackets => "[",
            Key.OemCloseBrackets => "]",
            Key.OemSemicolon => ";",
            Key.OemQuotes => "'",
            Key.OemTilde => "`",
            Key.Add => "Num +",
            Key.Subtract => "Num -",
            Key.Multiply => "Num *",
            Key.Divide => "Num /",
            Key.Decimal => "Num .",
            Key.Apps => "Menu",
            _ => key.ToString(),
        };
    }
}

public sealed class ShortcutChangedEventArgs : EventArgs
{
    public ShortcutChangedEventArgs(string shortcut)
    {
        Shortcut = shortcut;
    }

    public string Shortcut { get; }
}
