namespace Draft.ViewModels;

public abstract class SettingsPageViewModel
{
    protected SettingsPageViewModel(string title, SettingsViewModel settings)
    {
        Title = title;
        Settings = settings;
    }

    public string Title { get; }

    public SettingsViewModel Settings { get; }
}
