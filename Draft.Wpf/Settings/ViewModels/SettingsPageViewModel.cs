
namespace Draft.Settings.ViewModels;

public abstract class SettingsPageViewModel : BaseViewModel
{
    private readonly string _fallbackTitle;
    private readonly string _titleKey;

    protected SettingsPageViewModel(
        string titleKey,
        string fallbackTitle,
        SettingsWindowViewModel settings)
    {
        _titleKey = titleKey;
        _fallbackTitle = fallbackTitle;
        Settings = settings;
    }

    public string Title =>
        LocalizationService.Translate(_titleKey, _fallbackTitle, Settings.AppLanguage);

    public SettingsWindowViewModel Settings { get; }

    public virtual void RefreshLocalization()
    {
        OnPropertyChanged(nameof(Title));
    }
}
