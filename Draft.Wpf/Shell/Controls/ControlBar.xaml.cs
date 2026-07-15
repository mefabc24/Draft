using Draft.ExternalLinks.Services;
using System.Windows;
using System.Windows.Controls;

namespace Draft.Shell.Controls;

public partial class ControlBar : UserControl
{
    private const string ProjectUrl = "https://github.com/mefabc24/Draft";
    private readonly ExternalLinkService _externalLinkService = new();

    public ControlBar()
    {
        InitializeComponent();
    }

    private void LogoButton_Click(object sender, RoutedEventArgs e)
    {
        bool confirmBeforeOpening = DataContext is not MainWindowViewModel viewModel
            || viewModel.ConfirmBeforeOpeningExternalLinks;

        _externalLinkService.TryOpen(ProjectUrl, confirmBeforeOpening);
    }
}
