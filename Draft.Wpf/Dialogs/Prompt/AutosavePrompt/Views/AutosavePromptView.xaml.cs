using Draft.Dialogs.Prompt.AutosavePrompt.ViewModels;
using System.Windows.Controls;
using System.Windows.Threading;

namespace Draft.Dialogs.Prompt.AutosavePrompt.Views;

public partial class AutosavePromptView : UserControl
{
    public AutosavePromptView()
    {
        InitializeComponent();
        Loaded += AutosavePromptView_Loaded;
    }

    private AutosavePromptViewModel? ViewModel => DataContext as AutosavePromptViewModel;

    private void AutosavePromptView_Loaded(object sender, System.Windows.RoutedEventArgs e)
    {
        Dispatcher.BeginInvoke(
            new Action(() => ViewModel?.ApplyOpenedFeedback()),
            DispatcherPriority.ContextIdle);
    }
}
