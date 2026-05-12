using Draft.Dialogs.Message.Models;
using Draft.Dialogs.Message.Services;
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
    private readonly IMessageDialogService _messageDialogService = new MessageDialogService();
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
                ShowMessageDialog(
                    "Check for Updates",
                    result.Message,
                    MessageDialogType.Info);
                return;
            case UpdateCheckStatus.Failed:
                SetUpdateStatus("Unable to check for updates.");
                ShowMessageDialog(
                    "Check for Updates",
                    result.Message,
                    MessageDialogType.Error);
                return;
            case UpdateCheckStatus.UpdateAvailable:
                SetUpdateStatus(result.Message);
                break;
        }

        MessageDialogResult installResult = _messageDialogService.ShowMessage(
            new MessageDialogRequest(
                "Update Available",
                $"Draft {result.Version} is available. Install this update now? Draft will restart to finish installing.",
                MessageDialogType.Info,
                new[]
                {
                    MessageDialogButtonDefinition.Secondary("Cancel", MessageDialogResult.Cancel),
                    MessageDialogButtonDefinition.Primary("Install", new MessageDialogResult("install-update")),
                }));

        if (installResult.Id != "install-update")
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
            ShowMessageDialog(
                "Install Update",
                $"Unable to install the update. {ex.Message}",
                MessageDialogType.Error);
        }
    }

    private bool CanRestartForUpdate(Window? owner)
    {
        if (owner?.Owner?.DataContext is not MainWindowViewModel viewModel
            || !viewModel.HasUnsavedWork)
        {
            return true;
        }

        ShowMessageDialog(
            "Unsaved Changes",
            "Draft has unsaved work. Save or discard your changes before installing the update.",
            MessageDialogType.Warning);

        return false;
    }

    private void SetUpdateStatus(string status)
    {
        UpdateStatus = status;
    }

    private void ShowMessageDialog(string title, string description, MessageDialogType dialogType)
    {
        _messageDialogService.ShowMessage(
            new MessageDialogRequest(
                title,
                description,
                dialogType,
                new[]
                {
                    MessageDialogButtonDefinition.Primary("Okay", MessageDialogResult.Ok),
                }));
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
