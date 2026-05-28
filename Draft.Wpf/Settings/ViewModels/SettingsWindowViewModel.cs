using System.Runtime.CompilerServices;
using System.Windows.Input;

namespace Draft.Settings.ViewModels;

public class SettingsWindowViewModel : BaseViewModel
{
    private readonly GeneralSettingsPageViewModel _generalSettingsPage;
    private readonly EditorSettingsPageViewModel _editorSettingsPage;
    private readonly PreviewSettingsPageViewModel _previewSettingsPage;
    private readonly AppearanceSettingsPageViewModel _appearanceSettingsPage;
    private readonly ShortcutsSettingsPageViewModel _shortcutsSettingsPage;
    private readonly DevelopSettingsPageViewModel _developSettingsPage;
    private readonly AboutSettingsPageViewModel _aboutSettingsPage;
    private readonly SettingsApplicationService _settingsApplicationService = new();
    private readonly SettingsFileDialogService _settingsFileDialogService = new();
    private DraftSettings _originalSettings;
    private SettingsPage _selectedPage = SettingsPage.General;
    private SettingsPageViewModel _currentSettingsPage;

    private bool _reopenLastWorkspaceOnStartup;
    private bool _checkForUpdatesOnStartup = true;
    private bool _autosaveEnabled;
    private string _autosaveInterval = "10s";
    private bool _saveOnFocusLost;
    private bool _includeMarkdownSyntaxInCharacterCount;
    private bool _confirmBeforeClosingUnsavedFiles = true;
    private string _defaultStartupMode = "Last";
    private double _windowMinimumSizeScale = AppSettingsStore.DefaultWindowMinimumSizeScale;
    private string _defaultSaveLocation = string.Empty;
    private string _defaultFileExtension = AppSettingsStore.DefaultFileExtension;
    private bool _associateTxtFilesWithDraft;
    private string _editorFontFamily = "JetBrains Mono";
    private int _editorFontSize = 16;
    private double _lineHeight = 1.6;
    private bool _wordWrap = true;
    private bool _showLineNumbers = true;
    private bool _highlightCurrentLine = true;
    private string _showWhitespaceCharacters = "Never";
    private bool _showIndentationGuides;
    private int _tabSize = 4;
    private bool _insertSpacesInsteadOfTabs = true;
    private bool _autoPairBrackets = true;
    private bool _autoPairQuotes = true;
    private bool _markdownSyntaxHighlighting = true;
    private string _cursorStyle = "Line";
    private bool _cursorBlinking = true;
    private string _markdownTheme = AppSettingsStore.DefaultMarkdownTheme;
    private bool _confirmBeforeOpeningExternalLinks = true;
    private string _previewScrollSyncMode = AppSettingsStore.DefaultPreviewScrollSyncMode;
    private string _floatingMarkdownToolbarMode = AppSettingsStore.DefaultFloatingMarkdownToolbarMode;
    private string _appTheme = "Dark";
    private bool _isStatusBarVisible = true;
    private string _windowBorderAccentMode = AppSettingsStore.WindowBorderAccentDisabled;
    private string _toolbarControlbarPosition = AppSettingsStore.DefaultToolbarPosition;

    public SettingsWindowViewModel()
    {
        BrowseDefaultSaveLocationCommand = new RelayCommand(BrowseDefaultSaveLocation);
        ApplySettingsCommand = new RelayCommand(ApplyChanges);
        CancelSettingsCommand = new RelayCommand(CancelChanges);
        ResetToDefaultsCommand = new RelayCommand(ResetToDefaults);

        _originalSettings = AppSettingsStore.Load();
        ApplySettings(_originalSettings);

        _generalSettingsPage = new GeneralSettingsPageViewModel(this);
        _editorSettingsPage = new EditorSettingsPageViewModel(this);
        _previewSettingsPage = new PreviewSettingsPageViewModel(this);
        _appearanceSettingsPage = new AppearanceSettingsPageViewModel(this);
        _shortcutsSettingsPage = new ShortcutsSettingsPageViewModel(this);
        _developSettingsPage = new DevelopSettingsPageViewModel(this);
        _aboutSettingsPage = new AboutSettingsPageViewModel(this);
        _currentSettingsPage = _generalSettingsPage;
    }

    public static IReadOnlyList<string> AutosaveIntervalOptionValues =>
        SettingsOptionCatalog.AutosaveIntervalOptions;

    public IReadOnlyList<string> AutosaveIntervalOptions => AutosaveIntervalOptionValues;

    public IReadOnlyList<string> DefaultStartupModeOptions =>
        SettingsOptionCatalog.DefaultStartupModeOptions;

    public IReadOnlyList<double> WindowMinimumSizeScaleOptions =>
        SettingsOptionCatalog.WindowMinimumSizeScaleOptions;

    public IReadOnlyList<string> DefaultFileExtensionOptions =>
        SettingsOptionCatalog.DefaultFileExtensionOptions;

    public IReadOnlyList<string> EditorFontFamilyOptions =>
        SettingsOptionCatalog.EditorFontFamilyOptions;

    public IReadOnlyList<int> EditorFontSizeOptions =>
        SettingsOptionCatalog.EditorFontSizeOptions;

    public IReadOnlyList<double> LineHeightOptions =>
        SettingsOptionCatalog.LineHeightOptions;

    public IReadOnlyList<string> ShowWhitespaceCharactersOptions =>
        SettingsOptionCatalog.ShowWhitespaceCharactersOptions;

    public IReadOnlyList<int> TabSizeOptions =>
        SettingsOptionCatalog.TabSizeOptions;

    public IReadOnlyList<string> CursorStyleOptions =>
        SettingsOptionCatalog.CursorStyleOptions;

    public IReadOnlyList<string> MarkdownThemeOptions =>
        SettingsOptionCatalog.MarkdownThemeOptions;

    public IReadOnlyList<string> PreviewScrollSyncModeOptions =>
        SettingsOptionCatalog.PreviewScrollSyncModeOptions;

    public IReadOnlyList<string> FloatingMarkdownToolbarModeOptions =>
        SettingsOptionCatalog.FloatingMarkdownToolbarModeOptions;

    public IReadOnlyList<string> AppThemeOptions =>
        SettingsOptionCatalog.AppThemeOptions;

    public IReadOnlyList<string> WindowBorderAccentModeOptions =>
        SettingsOptionCatalog.WindowBorderAccentModeOptions;

    public IReadOnlyList<string> ToolbarControlbarPositionOptions =>
        SettingsOptionCatalog.ToolbarControlbarPositionOptions;

    public ICommand BrowseDefaultSaveLocationCommand { get; }

    public ICommand ApplySettingsCommand { get; }

    public ICommand CancelSettingsCommand { get; }

    public ICommand ResetToDefaultsCommand { get; }

    public event EventHandler<SettingsAppliedEventArgs>? SettingsApplied;

    public event EventHandler<ResetConfirmationRequestedEventArgs>? ResetConfirmationRequested;

    public event EventHandler? CloseRequested;

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

    public bool IsShortcutsSettingsSelected
    {
        get => _selectedPage == SettingsPage.Shortcuts;
        set
        {
            if (value)
                SelectSettingsPage(SettingsPage.Shortcuts);
        }
    }

    public bool IsDevelopSettingsVisible
    {
        get
        {
#if DEBUG
            return true;
#else
            return false;
#endif
        }
    }

    public bool IsDevelopSettingsSelected
    {
        get => _selectedPage == SettingsPage.Develop;
        set
        {
            if (value)
                SelectSettingsPage(SettingsPage.Develop);
        }
    }

    public bool IsAboutSettingsSelected
    {
        get => _selectedPage == SettingsPage.About;
        set
        {
            if (value)
                SelectSettingsPage(SettingsPage.About);
        }
    }

    public bool ReopenLastWorkspaceOnStartup
    {
        get => _reopenLastWorkspaceOnStartup;
        set => SetSetting(ref _reopenLastWorkspaceOnStartup, value);
    }

    public bool CheckForUpdatesOnStartup
    {
        get => _checkForUpdatesOnStartup;
        set => SetSetting(ref _checkForUpdatesOnStartup, value);
    }

    public bool AutosaveEnabled
    {
        get => _autosaveEnabled;
        set
        {
            if (SetSetting(ref _autosaveEnabled, value))
            {
                OnPropertyChanged(nameof(IsAutosaveIntervalEnabled));
            }
        }
    }

    public bool IsAutosaveIntervalEnabled => AutosaveEnabled;

    public string AutosaveInterval
    {
        get => _autosaveInterval;
        set => SetSetting(
            ref _autosaveInterval,
            EnsureOption(AutosaveIntervalOptions, value, "10s"));
    }

    public bool SaveOnFocusLost
    {
        get => _saveOnFocusLost;
        set => SetSetting(ref _saveOnFocusLost, value);
    }

    public bool IncludeMarkdownSyntaxInCharacterCount
    {
        get => _includeMarkdownSyntaxInCharacterCount;
        set => SetSetting(ref _includeMarkdownSyntaxInCharacterCount, value);
    }

    public bool ConfirmBeforeClosingUnsavedFiles
    {
        get => _confirmBeforeClosingUnsavedFiles;
        set => SetSetting(ref _confirmBeforeClosingUnsavedFiles, value);
    }

    public string DefaultStartupMode
    {
        get => _defaultStartupMode;
        set => SetSetting(
            ref _defaultStartupMode,
            EnsureOption(DefaultStartupModeOptions, value, "Last"));
    }

    public double WindowMinimumSizeScale
    {
        get => _windowMinimumSizeScale;
        set => SetSetting(
            ref _windowMinimumSizeScale,
            EnsureOption(
                WindowMinimumSizeScaleOptions,
                value,
                AppSettingsStore.DefaultWindowMinimumSizeScale));
    }

    public string DefaultSaveLocation
    {
        get => _defaultSaveLocation;
        set
        {
            if (SetSetting(ref _defaultSaveLocation, value ?? string.Empty))
            {
                OnPropertyChanged(nameof(DefaultSaveLocationDisplay));
            }
        }
    }

    public string DefaultSaveLocationDisplay
    {
        get => AppSettingsStore.ToFriendlyDocumentsPath(DefaultSaveLocation);
        set => DefaultSaveLocation = AppSettingsStore.ExpandFriendlyDocumentsPath(value ?? string.Empty);
    }

    public string DefaultFileExtension
    {
        get => GetDefaultFileExtensionDisplayName(_defaultFileExtension);
        set => SetSetting(
            ref _defaultFileExtension,
            GetDefaultFileExtensionValue(value));
    }

    public bool AssociateTxtFilesWithDraft
    {
        get => _associateTxtFilesWithDraft;
        set => SetSetting(ref _associateTxtFilesWithDraft, value);
    }

    public string EditorFontFamily
    {
        get => _editorFontFamily;
        set => SetSetting(
            ref _editorFontFamily,
            EnsureOption(EditorFontFamilyOptions, value, "JetBrains Mono"));
    }

    public int EditorFontSize
    {
        get => _editorFontSize;
        set => SetSetting(
            ref _editorFontSize,
            EnsureOption(EditorFontSizeOptions, value, 16));
    }

    public double LineHeight
    {
        get => _lineHeight;
        set => SetSetting(
            ref _lineHeight,
            EnsureOption(LineHeightOptions, value, 1.6));
    }

    public bool WordWrap
    {
        get => _wordWrap;
        set => SetSetting(ref _wordWrap, value);
    }

    public bool ShowLineNumbers
    {
        get => _showLineNumbers;
        set => SetSetting(ref _showLineNumbers, value);
    }

    public bool HighlightCurrentLine
    {
        get => _highlightCurrentLine;
        set => SetSetting(ref _highlightCurrentLine, value);
    }

    public string ShowWhitespaceCharacters
    {
        get => _showWhitespaceCharacters;
        set => SetSetting(
            ref _showWhitespaceCharacters,
            EnsureOption(ShowWhitespaceCharactersOptions, value, "Never"));
    }

    public bool ShowIndentationGuides
    {
        get => _showIndentationGuides;
        set => SetSetting(ref _showIndentationGuides, value);
    }

    public int TabSize
    {
        get => _tabSize;
        set => SetSetting(
            ref _tabSize,
            EnsureOption(TabSizeOptions, value, 4));
    }

    public bool InsertSpacesInsteadOfTabs
    {
        get => _insertSpacesInsteadOfTabs;
        set => SetSetting(ref _insertSpacesInsteadOfTabs, value);
    }

    public bool AutoPairBrackets
    {
        get => _autoPairBrackets;
        set => SetSetting(ref _autoPairBrackets, value);
    }

    public bool AutoPairQuotes
    {
        get => _autoPairQuotes;
        set => SetSetting(ref _autoPairQuotes, value);
    }

    public bool MarkdownSyntaxHighlighting
    {
        get => _markdownSyntaxHighlighting;
        set => SetSetting(ref _markdownSyntaxHighlighting, value);
    }

    public string CursorStyle
    {
        get => _cursorStyle;
        set => SetSetting(
            ref _cursorStyle,
            EnsureOption(CursorStyleOptions, value, "Line"));
    }

    public bool CursorBlinking
    {
        get => _cursorBlinking;
        set => SetSetting(ref _cursorBlinking, value);
    }

    public string MarkdownTheme
    {
        get => _markdownTheme;
        set => SetSetting(
            ref _markdownTheme,
            EnsureOption(MarkdownThemeOptions, value, AppSettingsStore.DefaultMarkdownTheme));
    }

    public bool ConfirmBeforeOpeningExternalLinks
    {
        get => _confirmBeforeOpeningExternalLinks;
        set => SetSetting(ref _confirmBeforeOpeningExternalLinks, value);
    }

    public string PreviewScrollSyncMode
    {
        get => GetPreviewScrollSyncDisplayName(_previewScrollSyncMode);
        set => SetSetting(
            ref _previewScrollSyncMode,
            GetPreviewScrollSyncValue(value));
    }

    public string FloatingMarkdownToolbarMode
    {
        get => GetFloatingMarkdownToolbarModeDisplayName(_floatingMarkdownToolbarMode);
        set => SetSetting(
            ref _floatingMarkdownToolbarMode,
            GetFloatingMarkdownToolbarModeValue(value));
    }

    public string AppTheme
    {
        get => _appTheme;
        set => SetSetting(
            ref _appTheme,
            EnsureOption(AppThemeOptions, value, "Dark"));
    }

    public bool IsStatusBarVisible
    {
        get => _isStatusBarVisible;
        set => SetSetting(ref _isStatusBarVisible, value);
    }

    public string WindowBorderAccentMode
    {
        get => GetWindowBorderAccentModeDisplayName(_windowBorderAccentMode);
        set => SetSetting(
            ref _windowBorderAccentMode,
            GetWindowBorderAccentModeValue(value));
    }

    public string AppliedWindowBorderAccentMode => _originalSettings.WindowBorderAccentMode;

    public string ToolbarControlbarPosition
    {
        get => _toolbarControlbarPosition;
        set => SetSetting(
            ref _toolbarControlbarPosition,
            EnsureOption(
                ToolbarControlbarPositionOptions,
                value,
                AppSettingsStore.DefaultToolbarPosition));
    }

    public void SelectSettingsPage(SettingsPage page)
    {
        if (page == SettingsPage.Develop && !IsDevelopSettingsVisible)
            return;

        if (_selectedPage == page)
            return;

        _selectedPage = page;
        CurrentSettingsPage = page switch
        {
            SettingsPage.General => _generalSettingsPage,
            SettingsPage.Editor => _editorSettingsPage,
            SettingsPage.Preview => _previewSettingsPage,
            SettingsPage.Appearance => _appearanceSettingsPage,
            SettingsPage.Shortcuts => _shortcutsSettingsPage,
            SettingsPage.Develop => IsDevelopSettingsVisible
                ? _developSettingsPage
                : _generalSettingsPage,
            SettingsPage.About => _aboutSettingsPage,
            _ => _generalSettingsPage,
        };

        OnPropertyChanged(nameof(IsGeneralSettingsSelected));
        OnPropertyChanged(nameof(IsEditorSettingsSelected));
        OnPropertyChanged(nameof(IsPreviewSettingsSelected));
        OnPropertyChanged(nameof(IsAppearanceSettingsSelected));
        OnPropertyChanged(nameof(IsShortcutsSettingsSelected));
        OnPropertyChanged(nameof(IsDevelopSettingsSelected));
        OnPropertyChanged(nameof(IsAboutSettingsSelected));
    }

    private void ApplySettings(DraftSettings settings)
    {
        AppSettingsStore.Normalize(settings);

        _reopenLastWorkspaceOnStartup = settings.ReopenLastWorkspaceOnStartup;
        _checkForUpdatesOnStartup = settings.CheckForUpdatesOnStartup;
        _autosaveEnabled = settings.AutosaveEnabled;
        _autosaveInterval = EnsureOption(AutosaveIntervalOptions, settings.AutosaveInterval, "10s");
        _saveOnFocusLost = settings.SaveOnFocusLost;
        _includeMarkdownSyntaxInCharacterCount = settings.IncludeMarkdownSyntaxInCharacterCount;
        _confirmBeforeClosingUnsavedFiles = settings.ConfirmBeforeClosingUnsavedFiles;
        _defaultStartupMode = EnsureOption(DefaultStartupModeOptions, settings.DefaultStartupMode, "Last");
        _windowMinimumSizeScale = EnsureOption(
            WindowMinimumSizeScaleOptions,
            settings.WindowMinimumSizeScale,
            AppSettingsStore.DefaultWindowMinimumSizeScale);
        _defaultSaveLocation = settings.DefaultSaveLocation ?? string.Empty;
        _defaultFileExtension = settings.DefaultFileExtension == AppSettingsStore.DefaultFileExtension
            ? settings.DefaultFileExtension
            : AppSettingsStore.DefaultFileExtension;
        _associateTxtFilesWithDraft = settings.AssociateTxtFilesWithDraft;
        _editorFontFamily = EnsureOption(EditorFontFamilyOptions, settings.EditorFontFamily, "JetBrains Mono");
        _editorFontSize = EnsureOption(EditorFontSizeOptions, settings.EditorFontSize, 16);
        _lineHeight = EnsureOption(LineHeightOptions, settings.LineHeight, 1.6);
        _wordWrap = settings.WordWrap;
        _showLineNumbers = settings.ShowLineNumbers;
        _highlightCurrentLine = settings.HighlightCurrentLine;
        _showWhitespaceCharacters = EnsureOption(ShowWhitespaceCharactersOptions, settings.ShowWhitespaceCharacters, "Never");
        _showIndentationGuides = settings.ShowIndentationGuides;
        _tabSize = EnsureOption(TabSizeOptions, settings.TabSize, 4);
        _insertSpacesInsteadOfTabs = settings.InsertSpacesInsteadOfTabs;
        _autoPairBrackets = settings.AutoPairBrackets;
        _autoPairQuotes = settings.AutoPairQuotes;
        _markdownSyntaxHighlighting = settings.MarkdownSyntaxHighlighting;
        _cursorStyle = EnsureOption(CursorStyleOptions, settings.CursorStyle, "Line");
        _cursorBlinking = settings.CursorBlinking;
        _markdownTheme = EnsureOption(
            MarkdownThemeOptions,
            settings.MarkdownTheme,
            AppSettingsStore.DefaultMarkdownTheme);
        _confirmBeforeOpeningExternalLinks = settings.ConfirmBeforeOpeningExternalLinks;
        _previewScrollSyncMode = EnsureOptionValue(
            GetPreviewScrollSyncValues(),
            settings.PreviewScrollSyncMode,
            AppSettingsStore.DefaultPreviewScrollSyncMode);
        _floatingMarkdownToolbarMode = EnsureOptionValue(
            GetFloatingMarkdownToolbarModeValues(),
            settings.FloatingMarkdownToolbarMode,
            AppSettingsStore.DefaultFloatingMarkdownToolbarMode);
        _appTheme = EnsureOption(AppThemeOptions, settings.AppTheme, "Dark");
        _isStatusBarVisible = settings.IsStatusBarVisible;
        _windowBorderAccentMode = EnsureOptionValue(
            GetWindowBorderAccentModeValues(),
            settings.WindowBorderAccentMode,
            AppSettingsStore.WindowBorderAccentDisabled);
        _toolbarControlbarPosition = EnsureOption(
            ToolbarControlbarPositionOptions,
            settings.ToolbarControlbarPosition,
            AppSettingsStore.DefaultToolbarPosition);
    }

    private void BrowseDefaultSaveLocation()
    {
        string? selectedLocation = _settingsFileDialogService.BrowseDefaultSaveLocation(DefaultSaveLocation);
        if (selectedLocation is not null)
        {
            DefaultSaveLocation = selectedLocation;
        }
    }

    private void ApplyChanges()
    {
        DraftSettings settings = CaptureSettings();
        _settingsApplicationService.SaveAndApply(settings);
        _originalSettings = settings;
        OnPropertyChanged(nameof(AppliedWindowBorderAccentMode));
        SettingsApplied?.Invoke(this, new SettingsAppliedEventArgs(settings));
        CloseRequested?.Invoke(this, EventArgs.Empty);
    }

    public void CancelChanges()
    {
        ApplySettings(_originalSettings);
        RaiseAllSettingsPropertiesChanged();
        CloseRequested?.Invoke(this, EventArgs.Empty);
    }

    private void ResetToDefaults()
    {
        ResetConfirmationRequestedEventArgs confirmation = new()
        {
            IsConfirmed = ResetConfirmationRequested is null,
        };
        ResetConfirmationRequested?.Invoke(this, confirmation);

        if (!confirmation.IsConfirmed)
            return;

        ApplySettings(AppSettingsStore.CreateDefaultSettings());
        RaiseAllSettingsPropertiesChanged();
        ApplyChanges();
    }

    private bool SetSetting<T>(
        ref T field,
        T value,
        [CallerMemberName] string? propertyName = null)
    {
        return SetProperty(ref field, value, propertyName);
    }

    private DraftSettings CaptureSettings()
    {
        return AppSettingsStore.Normalize(new DraftSettings
        {
            ReopenLastWorkspaceOnStartup = ReopenLastWorkspaceOnStartup,
            CheckForUpdatesOnStartup = CheckForUpdatesOnStartup,
            AutosaveEnabled = AutosaveEnabled,
            AutosaveInterval = AutosaveInterval,
            SaveOnFocusLost = SaveOnFocusLost,
            IncludeMarkdownSyntaxInCharacterCount = IncludeMarkdownSyntaxInCharacterCount,
            ConfirmBeforeClosingUnsavedFiles = ConfirmBeforeClosingUnsavedFiles,
            DefaultStartupMode = DefaultStartupMode,
            WindowMinimumSizeScale = WindowMinimumSizeScale,
            DefaultSaveLocation = DefaultSaveLocation,
            DefaultFileExtension = _defaultFileExtension,
            AssociateTxtFilesWithDraft = AssociateTxtFilesWithDraft,
            EditorFontFamily = EditorFontFamily,
            EditorFontSize = EditorFontSize,
            LineHeight = LineHeight,
            WordWrap = WordWrap,
            ShowLineNumbers = ShowLineNumbers,
            HighlightCurrentLine = HighlightCurrentLine,
            ShowWhitespaceCharacters = ShowWhitespaceCharacters,
            ShowIndentationGuides = ShowIndentationGuides,
            TabSize = TabSize,
            InsertSpacesInsteadOfTabs = InsertSpacesInsteadOfTabs,
            AutoPairBrackets = AutoPairBrackets,
            AutoPairQuotes = AutoPairQuotes,
            MarkdownSyntaxHighlighting = MarkdownSyntaxHighlighting,
            CursorStyle = CursorStyle,
            CursorBlinking = CursorBlinking,
            MarkdownTheme = MarkdownTheme,
            ConfirmBeforeOpeningExternalLinks = ConfirmBeforeOpeningExternalLinks,
            PreviewScrollSyncMode = _previewScrollSyncMode,
            FloatingMarkdownToolbarMode = _floatingMarkdownToolbarMode,
            ScrollPreviewToEditedSection = false,
            AppTheme = AppTheme,
            IsStatusBarVisible = IsStatusBarVisible,
            WindowBorderAccentMode = _windowBorderAccentMode,
            ToolbarControlbarPosition = ToolbarControlbarPosition,
        });
    }

    private static T EnsureOption<T>(IReadOnlyCollection<T> options, T value, T fallback)
    {
        return options.Contains(value) ? value : fallback;
    }

    private static T EnsureOptionValue<T>(
        IReadOnlyCollection<T> options,
        T value,
        T fallback)
    {
        return options.Contains(value) ? value : fallback;
    }

    private static IReadOnlyList<string> GetPreviewScrollSyncValues()
    {
        return SettingsOptionCatalog.PreviewScrollSyncValues;
    }

    private static IReadOnlyList<string> GetFloatingMarkdownToolbarModeValues()
    {
        return SettingsOptionCatalog.FloatingMarkdownToolbarModeValues;
    }

    private static IReadOnlyList<string> GetWindowBorderAccentModeValues()
    {
        return SettingsOptionCatalog.WindowBorderAccentModeValues;
    }

    private static string GetWindowBorderAccentModeValue(string displayName)
    {
        return SettingsDisplayValueMapper.GetWindowBorderAccentModeValue(displayName);
    }

    private static string GetWindowBorderAccentModeDisplayName(string value)
    {
        return SettingsDisplayValueMapper.GetWindowBorderAccentModeDisplayName(value);
    }

    private static string GetPreviewScrollSyncValue(string displayName)
    {
        return SettingsDisplayValueMapper.GetPreviewScrollSyncValue(displayName);
    }

    private static string GetPreviewScrollSyncDisplayName(string value)
    {
        return SettingsDisplayValueMapper.GetPreviewScrollSyncDisplayName(value);
    }

    private static string GetFloatingMarkdownToolbarModeValue(string displayName)
    {
        return SettingsDisplayValueMapper.GetFloatingMarkdownToolbarModeValue(displayName);
    }

    private static string GetFloatingMarkdownToolbarModeDisplayName(string value)
    {
        return SettingsDisplayValueMapper.GetFloatingMarkdownToolbarModeDisplayName(value);
    }

    private static string GetDefaultFileExtensionValue(string displayName)
    {
        return SettingsDisplayValueMapper.GetDefaultFileExtensionValue(displayName);
    }

    private static string GetDefaultFileExtensionDisplayName(string value)
    {
        return SettingsDisplayValueMapper.GetDefaultFileExtensionDisplayName(value);
    }

    private void RaiseAllSettingsPropertiesChanged()
    {
        OnPropertyChanged(nameof(ReopenLastWorkspaceOnStartup));
        OnPropertyChanged(nameof(CheckForUpdatesOnStartup));
        OnPropertyChanged(nameof(AutosaveEnabled));
        OnPropertyChanged(nameof(IsAutosaveIntervalEnabled));
        OnPropertyChanged(nameof(AutosaveInterval));
        OnPropertyChanged(nameof(SaveOnFocusLost));
        OnPropertyChanged(nameof(IncludeMarkdownSyntaxInCharacterCount));
        OnPropertyChanged(nameof(ConfirmBeforeClosingUnsavedFiles));
        OnPropertyChanged(nameof(DefaultStartupMode));
        OnPropertyChanged(nameof(WindowMinimumSizeScale));
        OnPropertyChanged(nameof(DefaultSaveLocation));
        OnPropertyChanged(nameof(DefaultSaveLocationDisplay));
        OnPropertyChanged(nameof(DefaultFileExtension));
        OnPropertyChanged(nameof(AssociateTxtFilesWithDraft));
        OnPropertyChanged(nameof(EditorFontFamily));
        OnPropertyChanged(nameof(EditorFontSize));
        OnPropertyChanged(nameof(LineHeight));
        OnPropertyChanged(nameof(WordWrap));
        OnPropertyChanged(nameof(ShowLineNumbers));
        OnPropertyChanged(nameof(HighlightCurrentLine));
        OnPropertyChanged(nameof(ShowWhitespaceCharacters));
        OnPropertyChanged(nameof(ShowIndentationGuides));
        OnPropertyChanged(nameof(TabSize));
        OnPropertyChanged(nameof(InsertSpacesInsteadOfTabs));
        OnPropertyChanged(nameof(AutoPairBrackets));
        OnPropertyChanged(nameof(AutoPairQuotes));
        OnPropertyChanged(nameof(MarkdownSyntaxHighlighting));
        OnPropertyChanged(nameof(CursorStyle));
        OnPropertyChanged(nameof(CursorBlinking));
        OnPropertyChanged(nameof(MarkdownTheme));
        OnPropertyChanged(nameof(ConfirmBeforeOpeningExternalLinks));
        OnPropertyChanged(nameof(PreviewScrollSyncMode));
        OnPropertyChanged(nameof(FloatingMarkdownToolbarMode));
        OnPropertyChanged(nameof(AppTheme));
        OnPropertyChanged(nameof(IsStatusBarVisible));
        OnPropertyChanged(nameof(WindowBorderAccentMode));
        OnPropertyChanged(nameof(AppliedWindowBorderAccentMode));
        OnPropertyChanged(nameof(ToolbarControlbarPosition));
    }
}
