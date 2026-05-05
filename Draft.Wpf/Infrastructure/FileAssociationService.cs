using Microsoft.Win32;
using System.IO;
using System.Runtime.InteropServices;

namespace Draft.Helpers;

public static class FileAssociationService
{
    private const string MarkdownProgId = "Draft.MarkdownFile";
    private const string TextProgId = "Draft.TextFile";
    private const string MarkdownDescription = "Markdown Document";
    private const string TextDescription = "Text Document";
    private const string ClassesRootPath = "Software\\Classes";
    private const uint ShcneAssocChanged = 0x08000000;
    private const uint ShcnfIdList = 0x0000;

    private static readonly string[] MarkdownExtensions =
    {
        ".md",
        ".markdown",
        ".mdown",
        ".mkd",
    };

    public static void RegisterMarkdownAssociations()
    {
        RegisterAssociations(MarkdownProgId, MarkdownDescription, MarkdownExtensions);
    }

    public static void UnregisterMarkdownAssociations()
    {
        UnregisterAssociations(MarkdownProgId, MarkdownExtensions);
    }

    public static void RegisterTextAssociations()
    {
        RegisterAssociations(TextProgId, TextDescription, [".txt"]);
    }

    public static void UnregisterTextAssociations()
    {
        UnregisterAssociations(TextProgId, [".txt"]);
    }

    public static void TryRegisterMarkdownAssociations()
    {
        TryRun(RegisterMarkdownAssociations);
    }

    public static void TryUnregisterMarkdownAssociations()
    {
        TryRun(UnregisterMarkdownAssociations);
    }

    public static bool TryApplyTextAssociations(bool enabled)
    {
        return TryRun(enabled ? RegisterTextAssociations : UnregisterTextAssociations);
    }

    private static void RegisterAssociations(
        string progId,
        string description,
        IEnumerable<string> extensions)
    {
        string executablePath = GetExecutablePath();
        string openCommand = $"\"{executablePath}\" \"%1\"";

        using RegistryKey classesRoot = OpenClassesRoot();
        using RegistryKey progIdKey = classesRoot.CreateSubKey(progId, true)
            ?? throw new InvalidOperationException($"Unable to create {progId} registry key.");

        progIdKey.SetValue(string.Empty, description, RegistryValueKind.String);

        using (RegistryKey defaultIconKey = progIdKey.CreateSubKey("DefaultIcon", true)
            ?? throw new InvalidOperationException($"Unable to create {progId} default icon registry key."))
        {
            defaultIconKey.SetValue(string.Empty, $"{executablePath},0", RegistryValueKind.String);
        }

        using (RegistryKey openCommandKey = progIdKey.CreateSubKey(@"shell\open\command", true)
            ?? throw new InvalidOperationException($"Unable to create {progId} open command registry key."))
        {
            openCommandKey.SetValue(string.Empty, openCommand, RegistryValueKind.String);
        }

        foreach (string extension in extensions)
        {
            using RegistryKey openWithProgIdsKey = classesRoot.CreateSubKey(
                $@"{extension}\OpenWithProgids",
                true)
                    ?? throw new InvalidOperationException(
                        $"Unable to create {extension} OpenWithProgids registry key.");

            openWithProgIdsKey.SetValue(progId, string.Empty, RegistryValueKind.String);
        }

        NotifyAssociationChanged();
    }

    private static void UnregisterAssociations(string progId, IEnumerable<string> extensions)
    {
        using RegistryKey classesRoot = OpenClassesRoot();

        foreach (string extension in extensions)
        {
            using RegistryKey? openWithProgIdsKey = classesRoot.OpenSubKey(
                $@"{extension}\OpenWithProgids",
                true);

            openWithProgIdsKey?.DeleteValue(progId, false);
        }

        classesRoot.DeleteSubKeyTree(progId, false);
        NotifyAssociationChanged();
    }

    private static RegistryKey OpenClassesRoot()
    {
        return Registry.CurrentUser.CreateSubKey(ClassesRootPath, true)
            ?? throw new InvalidOperationException("Unable to open the current user's file association registry root.");
    }

    private static string GetExecutablePath()
    {
        string? processPath = Environment.ProcessPath;

        if (!string.IsNullOrWhiteSpace(processPath))
            return Path.GetFullPath(processPath);

        return Path.GetFullPath(Environment.GetCommandLineArgs()[0]);
    }

    private static bool TryRun(Action action)
    {
        try
        {
            action();
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static void NotifyAssociationChanged()
    {
        SHChangeNotify(ShcneAssocChanged, ShcnfIdList, IntPtr.Zero, IntPtr.Zero);
    }

    [DllImport("shell32.dll")]
    private static extern void SHChangeNotify(
        uint wEventId,
        uint uFlags,
        IntPtr dwItem1,
        IntPtr dwItem2);
}
