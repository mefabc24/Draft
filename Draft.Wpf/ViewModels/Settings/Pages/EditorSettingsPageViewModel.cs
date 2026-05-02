namespace Draft.ViewModels;

public sealed class EditorSettingsPageViewModel : SettingsPageViewModel
{
    public EditorSettingsPageViewModel(SettingsViewModel settings)
        : base("Editor", "Typography, layout, editing behavior, and cursor options.", settings)
    {
    }
}
