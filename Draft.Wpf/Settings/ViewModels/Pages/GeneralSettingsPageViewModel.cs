using Draft.Settings.Models;
using Draft.Settings.ViewModels;

namespace Draft.Settings.ViewModels.Pages;

public sealed class GeneralSettingsPageViewModel : SettingsPageViewModel
{
    public GeneralSettingsPageViewModel(SettingsWindowViewModel settings)
        : base("General", settings)
    {
    }

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
}
