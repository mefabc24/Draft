namespace Draft.Settings.Models;

public sealed class SettingsAppliedEventArgs : EventArgs
{
    public SettingsAppliedEventArgs(DraftSettings settings)
    {
        Settings = settings;
    }

    public DraftSettings Settings { get; }
}

public sealed class ResetConfirmationRequestedEventArgs : EventArgs
{
    public bool IsConfirmed { get; set; }
}

public sealed class MenuCustomizationResetConfirmationRequestedEventArgs : EventArgs
{
    public MenuCustomizationResetConfirmationRequestedEventArgs(string menuName)
    {
        MenuName = menuName;
    }

    public string MenuName { get; }

    public bool IsConfirmed { get; set; }
}
