
namespace Draft.Settings.ViewModels;

public abstract class SettingsPageViewModel : BaseViewModel
{
    protected SettingsPageViewModel(string title, SettingsWindowViewModel settings)
    {
        Title = title;
        Settings = settings;
    }

    public string Title { get; }

    public SettingsWindowViewModel Settings { get; }
}
