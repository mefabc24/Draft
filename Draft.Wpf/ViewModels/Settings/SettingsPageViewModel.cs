namespace Draft.ViewModels;

public abstract class SettingsPageViewModel
{
    protected SettingsPageViewModel(string title, string description)
    {
        Title = title;
        Description = description;
    }

    public string Title { get; }

    public string Description { get; }
}
