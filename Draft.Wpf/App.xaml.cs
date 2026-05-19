using Draft.AppHost.Startup;
using System.Windows;
using Velopack;

namespace Draft;

public partial class App : Application
{
    private readonly AppStartupService _startupService = new();

    [STAThread]
    public static void Main(string[] args)
    {
        VelopackApp.Build()
            .OnAfterInstallFastCallback(_ => FileAssociationService.TryRegisterMarkdownAssociations())
            .OnAfterUpdateFastCallback(_ => FileAssociationService.TryRegisterMarkdownAssociations())
            .OnBeforeUninstallFastCallback(_ => FileAssociationService.TryUnregisterMarkdownAssociations())
            .Run();

        App app = new();
        app.InitializeComponent();
        app.Run();
    }

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);
        _startupService.Start(this, e);
    }
}
