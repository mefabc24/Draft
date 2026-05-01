using Draft.Helpers;

namespace Draft.ViewModels;

public class SettingsViewModel : BaseViewModel
{
    private readonly GeneralSettingsPageViewModel _generalSettingsPage = new();
    private readonly EditorSettingsPageViewModel _editorSettingsPage = new();
    private readonly PreviewSettingsPageViewModel _previewSettingsPage = new();
    private readonly AppearanceSettingsPageViewModel _appearanceSettingsPage = new();
    private SettingsPage _selectedPage = SettingsPage.General;
    private SettingsPageViewModel _currentSettingsPage;

    public SettingsViewModel()
    {
        _currentSettingsPage = _generalSettingsPage;
    }

    public SettingsPageViewModel CurrentSettingsPage
    {
        get => _currentSettingsPage;
        private set
        {
            if (_currentSettingsPage == value)
                return;

            _currentSettingsPage = value;
            OnPropertyChanged();
        }
    }

    public bool IsGeneralSettingsSelected
    {
        get => _selectedPage == SettingsPage.General;
        set
        {
            if (value)
                SelectSettingsPage(SettingsPage.General);
        }
    }

    public bool IsEditorSettingsSelected
    {
        get => _selectedPage == SettingsPage.Editor;
        set
        {
            if (value)
                SelectSettingsPage(SettingsPage.Editor);
        }
    }

    public bool IsPreviewSettingsSelected
    {
        get => _selectedPage == SettingsPage.Preview;
        set
        {
            if (value)
                SelectSettingsPage(SettingsPage.Preview);
        }
    }

    public bool IsAppearanceSettingsSelected
    {
        get => _selectedPage == SettingsPage.Appearance;
        set
        {
            if (value)
                SelectSettingsPage(SettingsPage.Appearance);
        }
    }

    public void SelectSettingsPage(SettingsPage page)
    {
        if (_selectedPage == page)
            return;

        _selectedPage = page;
        CurrentSettingsPage = page switch
        {
            SettingsPage.General => _generalSettingsPage,
            SettingsPage.Editor => _editorSettingsPage,
            SettingsPage.Preview => _previewSettingsPage,
            SettingsPage.Appearance => _appearanceSettingsPage,
            _ => _generalSettingsPage,
        };

        OnPropertyChanged(nameof(IsGeneralSettingsSelected));
        OnPropertyChanged(nameof(IsEditorSettingsSelected));
        OnPropertyChanged(nameof(IsPreviewSettingsSelected));
        OnPropertyChanged(nameof(IsAppearanceSettingsSelected));
    }
}
