using Draft.Dialogs.Prompts.GoToPosition.Models;
using System.Windows.Input;

namespace Draft.Dialogs.Prompts.GoToPosition.ViewModels;

public sealed class GoToPositionPromptViewModel : BaseViewModel
{
    private readonly int _currentLine;
    private string _errorMessage = string.Empty;
    private bool _hasError;
    private string _input;

    public GoToPositionPromptViewModel(GoToPositionPromptRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        _currentLine = request.CurrentLine;
        _input = $"{request.CurrentLine}:{request.CurrentColumn}";
        ConfirmCommand = new RelayCommand(Confirm);
        CancelCommand = new RelayCommand(Cancel);
    }

    public string Input
    {
        get => _input;
        set
        {
            if (SetProperty(ref _input, value))
            {
                ClearError();
            }
        }
    }

    public string ErrorMessage
    {
        get => _errorMessage;
        private set => SetProperty(ref _errorMessage, value);
    }

    public bool HasError
    {
        get => _hasError;
        private set => SetProperty(ref _hasError, value);
    }

    public GoToPositionPromptResult Result { get; private set; } = GoToPositionPromptResult.Cancelled;

    public ICommand ConfirmCommand { get; }

    public ICommand CancelCommand { get; }

    public event EventHandler? CloseRequested;

    private void Confirm()
    {
        if (!TryParseCursorPositionInput(Input, _currentLine, out GoToPositionPromptResult result, out string errorMessage))
        {
            ErrorMessage = errorMessage;
            HasError = true;
            return;
        }

        Result = result;
        CloseRequested?.Invoke(this, EventArgs.Empty);
    }

    private void Cancel()
    {
        Result = GoToPositionPromptResult.Cancelled;
        CloseRequested?.Invoke(this, EventArgs.Empty);
    }

    private void ClearError()
    {
        if (!HasError && string.IsNullOrEmpty(ErrorMessage))
            return;

        HasError = false;
        ErrorMessage = string.Empty;
    }

    private static bool TryParseCursorPositionInput(
        string? input,
        int currentLine,
        out GoToPositionPromptResult result,
        out string errorMessage)
    {
        result = GoToPositionPromptResult.Cancelled;
        errorMessage = string.Empty;

        string value = input?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(value))
        {
            errorMessage = "Enter a value like 14, 15:53, or :44.";
            return false;
        }

        if (value.StartsWith(':'))
        {
            string columnText = value[1..];

            if (string.IsNullOrWhiteSpace(columnText)
                || !TryParsePositiveNumber(columnText, out int currentLineColumn))
            {
                errorMessage = "For a column-only jump, enter : followed by a positive number.";
                return false;
            }

            result = GoToPositionPromptResult.Confirmed(currentLine, currentLineColumn);
            return true;
        }

        string[] parts = value.Split(':');

        if (parts.Length == 1)
        {
            if (!TryParsePositiveNumber(parts[0], out int line))
            {
                errorMessage = "Line must be a positive number.";
                return false;
            }

            result = GoToPositionPromptResult.Confirmed(line, 1);
            return true;
        }

        if (parts.Length == 2
            && TryParsePositiveNumber(parts[0], out int targetLine)
            && TryParsePositiveNumber(parts[1], out int targetColumn))
        {
            result = GoToPositionPromptResult.Confirmed(targetLine, targetColumn);
            return true;
        }

        errorMessage = "Enter a line as 14, a line and column as 15:53, or only a column as :44.";
        return false;
    }

    private static bool TryParsePositiveNumber(string value, out int number)
    {
        return int.TryParse(value.Trim(), out number) && number > 0;
    }
}
