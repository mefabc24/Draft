using Draft.Settings.ViewModels;

namespace Draft.Settings.Search;

public sealed class SettingsSearchResultViewModel
{
    internal SettingsSearchResultViewModel(
        SettingsSearchEntry entry,
        string title,
        string pageTitle)
    {
        Entry = entry;
        Title = title;
        PageTitle = pageTitle;
    }

    internal SettingsSearchEntry Entry { get; }

    public string Title { get; }

    public string PageTitle { get; }

    public SettingsPage Page => Entry.Page;

    public string TargetId => Entry.TargetId;
}

public sealed class SettingsSearchNavigationRequestedEventArgs(
    SettingsPage page,
    string targetId) : EventArgs
{
    public SettingsPage Page { get; } = page;

    public string TargetId { get; } = targetId;
}
