namespace Draft.Dialogs.Prompts.RevertSave.Services;

public sealed class RevertSaveOptionFormatter
{
    public string FormatWordCount(int wordCount)
    {
        return wordCount == 1 ? "1 word" : $"{wordCount:N0} words";
    }

    public string FormatVersionTimestamp(string action, DateTimeOffset timestampUtc)
    {
        TimeSpan elapsed = DateTimeOffset.UtcNow - timestampUtc;
        if (elapsed < TimeSpan.Zero)
        {
            elapsed = TimeSpan.Zero;
        }

        if (elapsed < TimeSpan.FromHours(1))
            return $"{action} {FormatRelativeTime(elapsed)}";

        return FormatAbsoluteTimestamp(action, timestampUtc);
    }

    private static string FormatAbsoluteTimestamp(string action, DateTimeOffset timestampUtc)
    {
        DateTime local = timestampUtc.ToLocalTime().DateTime;
        DateTime today = DateTime.Today;

        if (local.Date == today)
            return $"{action} today at {local:h:mm tt}";

        if (local.Date == today.AddDays(-1))
            return $"{action} yesterday at {local:h:mm tt}";

        return $"{action} {local:MMM d} at {local:h:mm tt}";
    }

    private static string FormatRelativeTime(TimeSpan elapsed)
    {
        if (elapsed < TimeSpan.FromMinutes(1))
            return "just now";

        if (elapsed < TimeSpan.FromHours(1))
        {
            int minutes = Math.Max(1, (int)Math.Round(elapsed.TotalMinutes));
            return minutes == 1 ? "1 min ago" : $"{minutes} mins ago";
        }

        if (elapsed < TimeSpan.FromDays(1))
        {
            int hours = Math.Max(1, (int)Math.Round(elapsed.TotalHours));
            return hours == 1 ? "1 hour ago" : $"{hours} hours ago";
        }

        int days = Math.Max(1, (int)Math.Round(elapsed.TotalDays));
        return days == 1 ? "1 day ago" : $"{days} days ago";
    }
}
