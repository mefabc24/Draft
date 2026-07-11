using Draft.Settings.Models;
using Draft.Settings.ViewModels;

namespace Draft.Settings.ViewModels.Pages;

public sealed class GeneralSettingsPageViewModel : SettingsPageViewModel
{
    public GeneralSettingsPageViewModel(SettingsWindowViewModel settings)
        : base("settings.general", "General", settings)
    {
    }

    public string LocalizationSectionTitle =>
        LocalizationService.Translate("settings.localizationSection", "LOCALIZATION", Settings.AppLanguage);

    public string LanguageTitle =>
        LocalizationService.Translate("settings.language", "Language", Settings.AppLanguage);

    public string LanguageDescription =>
        LocalizationService.Translate(
            "settings.language.description",
            "Choose the language used by Draft.",
            Settings.AppLanguage);

    public IReadOnlyList<string> AppLanguageOptions =>
        SettingsOptionCatalog.AppLanguageOptions;

    public IReadOnlyList<string> AutosaveIntervalOptions =>
        SettingsOptionCatalog.AutosaveIntervalOptions;

    public IReadOnlyList<string> WindowBorderAccentModeOptions =>
        SettingsOptionCatalog.WindowBorderAccentModeOptions;

    public IReadOnlyList<string> DefaultStartupModeOptions =>
        SettingsOptionCatalog.DefaultStartupModeOptions;

    public IReadOnlyList<double> WindowMinimumSizeScaleOptions =>
        SettingsOptionCatalog.WindowMinimumSizeScaleOptions;

    public IReadOnlyList<string> PreviewScrollSyncModeOptions =>
        SettingsOptionCatalog.PreviewScrollSyncModeOptions;

    public IReadOnlyList<string> FloatingMarkdownToolbarModeOptions =>
        SettingsOptionCatalog.FloatingMarkdownToolbarModeOptions;

    public IReadOnlyList<string> DefaultFileExtensionOptions =>
        SettingsOptionCatalog.DefaultFileExtensionOptions;

    public override void RefreshLocalization()
    {
        base.RefreshLocalization();
        OnPropertyChanged(nameof(LocalizationSectionTitle));
        OnPropertyChanged(nameof(LanguageTitle));
        OnPropertyChanged(nameof(LanguageDescription));
    }
}
