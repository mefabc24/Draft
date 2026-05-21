using Draft.AppHost.Session;
using Draft.Settings.Models;
using Draft.Shell.ViewModels;

namespace Draft.AppHost.Startup;

public sealed class StartupWorkspaceModeResolver
{
    public void ApplyStartupWorkspaceMode(
        MainWindowViewModel viewModel,
        DraftSettings settings,
        AppSessionState? sessionState)
    {
        if (settings.DefaultStartupMode == "Last")
        {
            if (!string.IsNullOrWhiteSpace(sessionState?.WorkspaceMode))
            {
                viewModel.SetWorkspaceMode(sessionState.WorkspaceMode);
            }
            return;
        }

        viewModel.SetWorkspaceMode(settings.DefaultStartupMode.ToLowerInvariant());
    }
}
