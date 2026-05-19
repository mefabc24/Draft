using System.Diagnostics;
using System.Reflection;
using System.Windows.Controls;
using System.Windows.Input;

namespace Draft.Settings.Views.Pages;

public partial class AboutSettingsView : UserControl
{
    private const string ProjectUrl = "https://github.com/mefabc24/Draft";

    public string VersionText { get; } = GetVersionText();

    public string VersionDescription => VersionText;

    public ICommand UpdateActionCommand { get; }

    public AboutSettingsView()
    {
        UpdateActionCommand = new RelayCommand(() =>
        {
            _ = UpdateCoordinator.Current.RunSettingsActionAsync(CancellationToken.None);
        });

        InitializeComponent();
    }

    private static string GetVersionText()
    {
        Assembly assembly = Assembly.GetExecutingAssembly();
        string? informationalVersion = assembly
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion;

        if (!string.IsNullOrWhiteSpace(informationalVersion))
        {
            int metadataSeparatorIndex = informationalVersion.IndexOf('+');
            return metadataSeparatorIndex > 0
                ? informationalVersion[..metadataSeparatorIndex]
                : informationalVersion;
        }

        Version? version = assembly.GetName().Version;
        return version is null
            ? "Unknown"
            : $"{version.Major}.{version.Minor}.{version.Build}";
    }

    private void GitHubButton_Click(object sender, System.Windows.RoutedEventArgs e)
    {
        Process.Start(new ProcessStartInfo
        {
            FileName = ProjectUrl,
            UseShellExecute = true,
        });
    }

}
