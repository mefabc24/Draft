using System.Text;
using Draft.Settings.Models;
using Draft.Settings.Shortcuts;
using Draft.Settings.ViewModels;

namespace Draft.Settings.Search;

public sealed record SettingsSearchEntry(
    SettingsPage Page,
    string TargetId,
    string TitleKey,
    string FallbackTitle,
    string? DescriptionKey = null,
    string DescriptionFallback = "",
    IReadOnlyList<string>? Keywords = null);

public static class SettingsSearchCatalog
{
    public static IReadOnlyList<SettingsSearchEntry> Entries { get; } = CreateEntries();

    private static IReadOnlyList<SettingsSearchEntry> CreateEntries()
    {
        List<SettingsSearchEntry> entries = new();

        AddStaticEntries(entries, SettingsPage.General,
            "settings.language",
            "settings.general.reopenLastWorkspace",
            "settings.general.checkForUpdatesOnStartup",
            "settings.general.autosaveEnabled",
            "settings.general.autosaveInterval",
            "settings.general.saveOnFocusLost",
            "settings.general.confirmBeforeClosingUnsavedFiles",
            "settings.general.windowBorderAccent",
            "settings.general.defaultStartupMode",
            "settings.general.windowMinimumSizeScale",
            "settings.general.scrollSyncMode",
            "settings.general.floatingMarkdownToolbar",
            "settings.general.defaultSaveLocation",
            "settings.general.defaultFileExtension",
            "settings.general.associateTxtFiles");

        AddStaticEntries(entries, SettingsPage.Editor,
            "settings.editor.fontFamily",
            "settings.editor.fontSize",
            "settings.editor.lineHeight",
            "settings.editor.wordWrap",
            "settings.editor.showLineNumbers",
            "settings.editor.highlightCurrentLine",
            "settings.editor.includeMarkdownSyntaxInCharacterCount",
            "settings.editor.showWhitespaceCharacters",
            "settings.editor.showIndentationGuides",
            "settings.editor.tabSize",
            "settings.editor.insertSpacesInsteadOfTabs",
            "settings.editor.autoPairBrackets",
            "settings.editor.autoPairQuotes",
            "settings.editor.markdownSyntaxHighlighting",
            "settings.editor.cursorStyle",
            "settings.editor.cursorBlinking");

        AddStaticEntries(entries, SettingsPage.Preview,
            "settings.preview.markdownTheme",
            "settings.preview.confirmBeforeOpeningExternalLinks");

        AddStaticEntries(entries, SettingsPage.Appearance,
            "settings.appearance.appTheme",
            "settings.appearance.toolbarPosition");

        AddStaticEntries(entries, SettingsPage.StatusBar,
            "settings.statusBar.visibility",
            "settings.statusBar.fileType",
            "settings.statusBar.encoding",
            "settings.statusBar.wordCount",
            "settings.statusBar.characterCount",
            "settings.statusBar.cursorPosition",
            "settings.statusBar.revertButton",
            "settings.statusBar.saveStatus",
            "settings.statusBar.autosaveStatus",
            "settings.statusBar.reportBugButton",
            "settings.statusBar.appVersion");

        AddMenuCustomizationEntries(
            entries,
            SettingsPage.FloatingMarkdownToolbar,
            MenuCustomizationCatalog.FloatingMarkdownToolbarDefinitions);
        AddMenuCustomizationEntries(
            entries,
            SettingsPage.QuickInsert,
            MenuCustomizationCatalog.QuickInsertMenuDefinitions);

        foreach (ShortcutActionDefinition shortcut in ShortcutSettingsCatalog.Actions)
        {
            string titleKey = $"shortcuts.actions.{shortcut.Id}.title";
            string descriptionKey = $"shortcuts.actions.{shortcut.Id}.description";
            entries.Add(new SettingsSearchEntry(
                SettingsPage.Shortcuts,
                shortcut.Id,
                titleKey,
                shortcut.Title,
                descriptionKey,
                shortcut.Description,
                shortcut.SearchKeywords));
        }

        return entries;
    }

    private static void AddStaticEntries(
        ICollection<SettingsSearchEntry> entries,
        SettingsPage page,
        params string[] titleKeys)
    {
        foreach (string titleKey in titleKeys)
        {
            entries.Add(new SettingsSearchEntry(
                page,
                titleKey,
                titleKey,
                HumanizeKey(titleKey),
                $"{titleKey}.description"));
        }
    }

    private static void AddMenuCustomizationEntries(
        ICollection<SettingsSearchEntry> entries,
        SettingsPage page,
        IReadOnlyList<MenuCustomizationDefinition> definitions)
    {
        entries.Add(new SettingsSearchEntry(
            page,
            "settings.menuCustomization.defaultLayout",
            "settings.menuCustomization.defaultLayout",
            "Default layout",
            "settings.menuCustomization.defaultLayout.description"));

        foreach (MenuCustomizationDefinition definition in definitions)
        {
            entries.Add(new SettingsSearchEntry(
                page,
                definition.Id,
                definition.TitleKey,
                definition.FallbackTitle,
                Keywords: ["customize", "menu", definition.Id]));
        }
    }

    private static string HumanizeKey(string key)
    {
        string value = key[(key.LastIndexOf('.') + 1)..];
        StringBuilder result = new(value.Length + 8);

        for (int index = 0; index < value.Length; index++)
        {
            char character = value[index];
            bool startsWord = index > 0
                && char.IsUpper(character)
                && (char.IsLower(value[index - 1]) || char.IsDigit(value[index - 1]));

            if (startsWord)
                result.Append(' ');

            result.Append(index == 0 ? char.ToUpperInvariant(character) : character);
        }

        return result.ToString();
    }
}
