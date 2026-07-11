using System.Globalization;

namespace Draft.Dialogs.Prompts.RevertSave.Services;

public sealed class RevertSaveOptionFormatter
{
    private static readonly CultureInfo TimestampCulture = CultureInfo.InvariantCulture;

    public string FormatWordCount(int wordCount)
    {
        return wordCount == 1
            ? LocalizationService.Translate("revertSave.wordCountSingular", "1 word")
            : LocalizationService.TranslateFormat(
                "revertSave.wordCountPlural",
                "{count} words",
                new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["count"] = wordCount.ToString("N0", CultureInfo.CurrentCulture),
                });
    }

    public string FormatVersionTimestamp(string action, DateTimeOffset timestampUtc)
    {
        TimeSpan elapsed = DateTimeOffset.UtcNow - timestampUtc;
        if (elapsed < TimeSpan.Zero)
        {
            elapsed = TimeSpan.Zero;
        }

        if (elapsed < TimeSpan.FromHours(1))
        {
            return LocalizationService.TranslateFormat(
                "revertSave.timestampRelative",
                "{action} {time}",
                new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["action"] = action,
                    ["time"] = FormatRelativeTime(elapsed),
                });
        }

        return FormatAbsoluteTimestamp(action, timestampUtc);
    }

    private static string FormatAbsoluteTimestamp(string action, DateTimeOffset timestampUtc)
    {
        DateTime local = timestampUtc.ToLocalTime().DateTime;
        DateTime today = DateTime.Today;

        if (local.Date == today)
            return LocalizationService.TranslateFormat(
                "revertSave.timestampToday",
                "{action} today at {time}",
                new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["action"] = action,
                    ["time"] = FormatLocalTime(local),
                });

        if (local.Date == today.AddDays(-1))
            return LocalizationService.TranslateFormat(
                "revertSave.timestampYesterday",
                "{action} yesterday at {time}",
                new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["action"] = action,
                    ["time"] = FormatLocalTime(local),
                });

        return LocalizationService.TranslateFormat(
            "revertSave.timestampDate",
            "{action} {date} at {time}",
            new Dictionary<string, string>(StringComparer.Ordinal)
            {
                ["action"] = action,
                ["date"] = local.ToString("MMM d", TimestampCulture),
                ["time"] = FormatLocalTime(local),
            });
    }

    private static string FormatLocalTime(DateTime local)
    {
        return local.ToString("h:mm tt", TimestampCulture);
    }

    private static string FormatRelativeTime(TimeSpan elapsed)
    {
        if (elapsed < TimeSpan.FromMinutes(1))
            return LocalizationService.Translate("revertSave.justNow", "just now");

        if (elapsed < TimeSpan.FromHours(1))
        {
            int minutes = Math.Max(1, (int)Math.Round(elapsed.TotalMinutes));
            return minutes == 1
                ? LocalizationService.Translate("revertSave.minuteAgo", "1 min ago")
                : LocalizationService.TranslateFormat(
                    "revertSave.minutesAgo",
                    "{count} mins ago",
                    new Dictionary<string, string>(StringComparer.Ordinal)
                    {
                        ["count"] = minutes.ToString(CultureInfo.CurrentCulture),
                    });
        }

        if (elapsed < TimeSpan.FromDays(1))
        {
            int hours = Math.Max(1, (int)Math.Round(elapsed.TotalHours));
            return hours == 1
                ? LocalizationService.Translate("revertSave.hourAgo", "1 hour ago")
                : LocalizationService.TranslateFormat(
                    "revertSave.hoursAgo",
                    "{count} hours ago",
                    new Dictionary<string, string>(StringComparer.Ordinal)
                    {
                        ["count"] = hours.ToString(CultureInfo.CurrentCulture),
                    });
        }

        int days = Math.Max(1, (int)Math.Round(elapsed.TotalDays));
        return days == 1
            ? LocalizationService.Translate("revertSave.dayAgo", "1 day ago")
            : LocalizationService.TranslateFormat(
                "revertSave.daysAgo",
                "{count} days ago",
                new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["count"] = days.ToString(CultureInfo.CurrentCulture),
                });
    }
}
