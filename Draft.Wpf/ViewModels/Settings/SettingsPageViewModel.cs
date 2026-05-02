namespace Draft.ViewModels;

public abstract class SettingsPageViewModel
{
    protected SettingsPageViewModel(string title, string description, SettingsViewModel settings)
    {
        Title = title;
        Description = description;
        Settings = settings;
    }

    public string Title { get; }

    public string Description { get; }

    public SettingsViewModel Settings { get; }
}
