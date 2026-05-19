namespace Draft.Dialogs.Prompts.GoToPosition.Models;

public sealed class GoToPositionPromptRequest
{
    public GoToPositionPromptRequest(int currentLine, int currentColumn)
    {
        if (currentLine <= 0)
            throw new ArgumentOutOfRangeException(nameof(currentLine), "Current line must be positive.");

        if (currentColumn <= 0)
            throw new ArgumentOutOfRangeException(nameof(currentColumn), "Current column must be positive.");

        CurrentLine = currentLine;
        CurrentColumn = currentColumn;
    }

    public int CurrentLine { get; }

    public int CurrentColumn { get; }
}
