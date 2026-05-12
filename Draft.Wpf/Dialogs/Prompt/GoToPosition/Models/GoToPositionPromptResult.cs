namespace Draft.Dialogs.Prompt.GoToPosition.Models;

public sealed record GoToPositionPromptResult(bool IsConfirmed, int Line, int Column)
{
    public static GoToPositionPromptResult Cancelled { get; } = new(false, 1, 1);

    public static GoToPositionPromptResult Confirmed(int line, int column)
    {
        if (line <= 0)
            throw new ArgumentOutOfRangeException(nameof(line), "Line must be positive.");

        if (column <= 0)
            throw new ArgumentOutOfRangeException(nameof(column), "Column must be positive.");

        return new GoToPositionPromptResult(true, line, column);
    }
}
