using Draft.Helpers;
using Draft.ViewModels;
using System.ComponentModel;
using System.Diagnostics;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Windows;
using System.Windows.Controls;

namespace Draft.Views.Settings;

public partial class AboutSettingsView : UserControl, INotifyPropertyChanged
{
    private const string ProjectUrl = "https://github.com/mefabc24/Draft";
    private readonly UpdateService _updateService = new();
    private bool _isCheckingForUpdates;
    private bool _isCheckForUpdatesEnabled = true;
    private string _updateStatus = "Updates are checked manually.";

    public string VersionText { get; } = GetVersionText();

    public string VersionDescription => VersionText;

    public bool IsCheckForUpdatesEnabled
    {
        get => _isCheckForUpdatesEnabled;
        private set => SetProperty(ref _isCheckForUpdatesEnabled, value);
    }

    public string UpdateStatus
    {
        get => _updateStatus;
        private set => SetProperty(ref _updateStatus, value);
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    public AboutSettingsView()
    {
        InitializeComponent();
    }

    private static string GetVersionText()
    {
        Assembly assembly = Assembly.GetExecutingAssembly();
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

    private async void CheckForUpdatesButton_Click(object sender, RoutedEventArgs e)
    {
        if (_isCheckingForUpdates)
            return;

        _isCheckingForUpdates = true;
        IsCheckForUpdatesEnabled = false;
        SetUpdateStatus("Checking for updates...");

        try
        {
            UpdateCheckResult result = await _updateService.CheckForUpdatesAsync(CancellationToken.None);
            await HandleUpdateCheckResultAsync(result);
        }
        finally
        {
            _isCheckingForUpdates = false;
            IsCheckForUpdatesEnabled = true;
        }
    }

    private async Task HandleUpdateCheckResultAsync(UpdateCheckResult result)
    {
        Window? owner = Window.GetWindow(this);

        switch (result.Status)
        {
            case UpdateCheckStatus.NotInstalledWithVelopack:
            case UpdateCheckStatus.UpToDate:
                SetUpdateStatus(result.Message);
                MessageBox.Show(
                    owner,
                    result.Message,
                    "Check for Updates",
                    MessageBoxButton.OK,
                    MessageBoxImage.Information);
                return;
            case UpdateCheckStatus.Failed:
                SetUpdateStatus("Unable to check for updates.");
                MessageBox.Show(
                    owner,
                    result.Message,
                    "Check for Updates",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
                return;
            case UpdateCheckStatus.UpdateAvailable:
                SetUpdateStatus(result.Message);
                break;
        }

        MessageBoxResult installResult = MessageBox.Show(
            owner,
            $"Draft {result.Version} is available.\n\nInstall this update now? Draft will restart to finish installing.",
            "Update Available",
            MessageBoxButton.YesNo,
            MessageBoxImage.Information);

        if (installResult != MessageBoxResult.Yes)
        {
            SetUpdateStatus("Update available.");
            return;
        }

        if (!CanRestartForUpdate(owner))
            return;

        try
        {
            SetUpdateStatus("Downloading update...");
            await _updateService.DownloadAndApplyUpdateAsync(
                result,
                progress => Dispatcher.Invoke(() => SetUpdateStatus($"Downloading update... {progress}%")),
                CancellationToken.None);
        }
        catch (Exception ex)
        {
            SetUpdateStatus("Unable to install update.");
            MessageBox.Show(
                owner,
                $"Unable to install the update.\n\n{ex.Message}",
                "Install Update",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
        }
    }

    private static bool CanRestartForUpdate(Window? owner)
    {
        if (owner?.Owner?.DataContext is not MainWindowViewModel viewModel
            || !viewModel.HasUnsavedWork)
        {
            return true;
        }

        MessageBox.Show(
            owner,
            "Draft has unsaved work. Save or discard your changes before installing the update.",
            "Unsaved Changes",
            MessageBoxButton.OK,
            MessageBoxImage.Warning);

        return false;
    }

    private void SetUpdateStatus(string status)
    {
        UpdateStatus = status;
    }

    private bool SetProperty<T>(
        ref T field,
        T value,
        [CallerMemberName] string? propertyName = null)
    {
        if (EqualityComparer<T>.Default.Equals(field, value))
            return false;

        field = value;
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        return true;
    }
}
