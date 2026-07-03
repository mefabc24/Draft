using Draft.Dialogs.Prompts.Export.Models;
using Draft.Export.Models;
using Draft.Settings.Models;
using System.Windows.Input;

namespace Draft.Dialogs.Prompts.Export.ViewModels;

public sealed class ExportPromptViewModel : BaseViewModel
{
    private ExportFormatOption _selectedFormat;
    private MarkdownPreviewThemeOption _selectedPreviewTheme;

    public ExportPromptViewModel(ExportPromptRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        _selectedFormat = EnsureFormatOption(request.DefaultFormat);
        _selectedPreviewTheme = EnsurePreviewThemeOption(request.DefaultPreviewTheme);

        ConfirmCommand = new RelayCommand(Confirm);
        CancelCommand = new RelayCommand(Cancel);
    }

    public IReadOnlyList<ExportFormatOption> FormatOptions { get; } =
    [
        new(ExportFormat.Pdf, "PDF"),
        new(ExportFormat.Html, "HTML"),
        new(ExportFormat.Png, "PNG"),
    ];

    public IReadOnlyList<MarkdownPreviewThemeOption> PreviewThemeOptions =>
        MarkdownPreviewThemeCatalog.ThemeOptions;

    public ExportFormatOption SelectedFormat
    {
        get => _selectedFormat;
        set => SetProperty(ref _selectedFormat, value ?? EnsureFormatOption(ExportFormat.Pdf));
    }

    public MarkdownPreviewThemeOption SelectedPreviewTheme
    {
        get => _selectedPreviewTheme;
        set => SetProperty(
            ref _selectedPreviewTheme,
            value ?? PreviewThemeOptions[0]);
    }

    public ExportPromptResult Result { get; private set; } = ExportPromptResult.Cancelled;

    public ICommand ConfirmCommand { get; }

    public ICommand CancelCommand { get; }

    public event EventHandler? CloseRequested;

    private void Confirm()
    {
        Result = ExportPromptResult.Confirmed(SelectedFormat.Format, SelectedPreviewTheme.Id);
        CloseRequested?.Invoke(this, EventArgs.Empty);
    }

    private void Cancel()
    {
        Result = ExportPromptResult.Cancelled;
        CloseRequested?.Invoke(this, EventArgs.Empty);
    }

    private ExportFormatOption EnsureFormatOption(ExportFormat format)
    {
        return FormatOptions.FirstOrDefault(option => option.Format == format)
            ?? FormatOptions[0];
    }

    private MarkdownPreviewThemeOption EnsurePreviewThemeOption(string theme)
    {
        string themeId = MarkdownPreviewThemeCatalog.GetThemeId(theme);

        return PreviewThemeOptions.FirstOrDefault(option =>
            string.Equals(option.Id, themeId, StringComparison.OrdinalIgnoreCase))
            ?? PreviewThemeOptions[0];
    }
}
