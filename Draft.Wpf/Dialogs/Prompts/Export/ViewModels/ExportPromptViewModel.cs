using Draft.Dialogs.Prompts.Export.Models;
using Draft.Export.Models;
using System.Windows.Input;

namespace Draft.Dialogs.Prompts.Export.ViewModels;

public sealed class ExportPromptViewModel : BaseViewModel
{
    private ExportFormatOption _selectedFormat;

    public ExportPromptViewModel(ExportPromptRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        _selectedFormat = EnsureFormatOption(request.DefaultFormat);

        ConfirmCommand = new RelayCommand(Confirm);
        CancelCommand = new RelayCommand(Cancel);
    }

    public IReadOnlyList<ExportFormatOption> FormatOptions { get; } =
    [
        new(ExportFormat.Pdf, "PDF"),
        new(ExportFormat.Html, "HTML"),
        new(ExportFormat.Png, "PNG"),
    ];

    public ExportFormatOption SelectedFormat
    {
        get => _selectedFormat;
        set => SetProperty(ref _selectedFormat, value ?? EnsureFormatOption(ExportFormat.Pdf));
    }

    public ExportPromptResult Result { get; private set; } = ExportPromptResult.Cancelled;

    public ICommand ConfirmCommand { get; }

    public ICommand CancelCommand { get; }

    public event EventHandler? CloseRequested;

    private void Confirm()
    {
        Result = ExportPromptResult.Confirmed(SelectedFormat.Format);
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
}
