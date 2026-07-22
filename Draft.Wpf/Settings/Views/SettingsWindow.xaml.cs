using Draft.Dialogs.Message.Models;
using Draft.Dialogs.Message.Services;
using Draft.Settings.Controls;
using Draft.Settings.Search;
using Draft.Settings.ViewModels;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Threading;

namespace Draft.Settings.Views;

public partial class SettingsWindow : Window
{
    private readonly IMessageDialogService _messageDialogService = new MessageDialogService();

    public event EventHandler<SettingsAppliedEventArgs>? SettingsApplied;

    public SettingsWindow()
        : this(SettingsPage.General)
    {
    }

    public SettingsWindow(SettingsPage initialPage)
    {
        InitializeComponent();
        LocationChanged += SettingsWindow_PositionChanged;
        SizeChanged += SettingsWindow_SizeChanged;
        StateChanged += SettingsWindow_PositionChanged;

        SettingsWindowViewModel viewModel = new();
        viewModel.SelectSettingsPage(initialPage);
        viewModel.CloseRequested += ViewModel_CloseRequested;
        viewModel.MenuCustomizationResetConfirmationRequested +=
            ViewModel_MenuCustomizationResetConfirmationRequested;
        viewModel.ResetConfirmationRequested += ViewModel_ResetConfirmationRequested;
        viewModel.SettingsSearchNavigationRequested +=
            ViewModel_SettingsSearchNavigationRequested;
        viewModel.SettingsApplied += ViewModel_SettingsApplied;
        DataContext = viewModel;
    }

    private void CloseButton_Click(object sender, RoutedEventArgs e)
    {
        if (DataContext is SettingsWindowViewModel viewModel)
        {
            viewModel.CancelChanges();
            return;
        }

        Close();
    }

    protected override void OnClosed(EventArgs e)
    {
        if (DataContext is SettingsWindowViewModel viewModel)
        {
            viewModel.CloseRequested -= ViewModel_CloseRequested;
            viewModel.MenuCustomizationResetConfirmationRequested -=
                ViewModel_MenuCustomizationResetConfirmationRequested;
            viewModel.ResetConfirmationRequested -= ViewModel_ResetConfirmationRequested;
            viewModel.SettingsSearchNavigationRequested -=
                ViewModel_SettingsSearchNavigationRequested;
            viewModel.SettingsApplied -= ViewModel_SettingsApplied;
        }

        LocationChanged -= SettingsWindow_PositionChanged;
        SizeChanged -= SettingsWindow_SizeChanged;
        StateChanged -= SettingsWindow_PositionChanged;
        CloseShadowWindow();

        base.OnClosed(e);
    }

    private void ViewModel_MenuCustomizationResetConfirmationRequested(
        object? sender,
        MenuCustomizationResetConfirmationRequestedEventArgs e)
    {
        string appLanguage = sender is SettingsWindowViewModel viewModel
            ? viewModel.AppLanguage
            : AppSettingsStore.DefaultAppLanguage;
        IReadOnlyDictionary<string, string> parameters = new Dictionary<string, string>
        {
            ["menuName"] = e.MenuName,
        };

        MessageDialogResult result = _messageDialogService.ShowMessage(
            new MessageDialogRequest(
                LocalizationService.TranslateFormat(
                    "settings.menuCustomization.resetDefaults.dialog.title",
                    "Reset {menuName}?",
                    parameters,
                    appLanguage),
                LocalizationService.TranslateFormat(
                    "settings.menuCustomization.resetDefaults.dialog.description",
                    "Reset the visibility and position of all items in {menuName} to their default values?",
                    parameters,
                    appLanguage),
                MessageDialogType.Warning,
                new[]
                {
                    MessageDialogButtonDefinition.Secondary(
                        LocalizationService.Translate("common.cancel", "Cancel", appLanguage),
                        MessageDialogResult.Cancel),
                    MessageDialogButtonDefinition.Primary(
                        LocalizationService.Translate("common.reset", "Reset", appLanguage),
                        new MessageDialogResult("reset-menu-customization")),
                }));

        e.IsConfirmed = result.Id == "reset-menu-customization";
    }

    private void ViewModel_ResetConfirmationRequested(
        object? sender,
        ResetConfirmationRequestedEventArgs e)
    {
        string appLanguage = sender is SettingsWindowViewModel viewModel
            ? viewModel.AppLanguage
            : AppSettingsStore.DefaultAppLanguage;

        MessageDialogResult result = _messageDialogService.ShowMessage(
            new MessageDialogRequest(
                LocalizationService.Translate("settings.resetDefaults.title", "Reset Settings", appLanguage),
                LocalizationService.Translate(
                    "settings.resetDefaults.description",
                    "Reset all settings to their default values? This will be saved immediately.",
                    appLanguage),
                MessageDialogType.Warning,
                new[]
                {
                    MessageDialogButtonDefinition.Secondary(
                        LocalizationService.Translate("common.cancel", "Cancel", appLanguage),
                        MessageDialogResult.Cancel),
                    MessageDialogButtonDefinition.Primary(
                        LocalizationService.Translate("common.reset", "Reset", appLanguage),
                        new MessageDialogResult("reset")),
                }));

        e.IsConfirmed = result.Id == "reset";
    }

    private void ViewModel_SettingsApplied(object? sender, SettingsAppliedEventArgs e)
    {
        SettingsApplied?.Invoke(this, e);
    }

    private void GlobalSettingsSearchTextBox_GotKeyboardFocus(
        object sender,
        KeyboardFocusChangedEventArgs e)
    {
        if (DataContext is SettingsWindowViewModel viewModel)
            viewModel.OpenSettingsSearchPopup();
    }

    private void GlobalSettingsSearchTextBox_TextChanged(
        object sender,
        TextChangedEventArgs e)
    {
        if (GlobalSettingsSearchResultsList is not null)
            GlobalSettingsSearchResultsList.SelectedIndex = -1;
    }

    private void GlobalSettingsSearchTextBox_PreviewKeyDown(
        object sender,
        KeyEventArgs e)
    {
        if (DataContext is not SettingsWindowViewModel viewModel)
            return;

        switch (e.Key)
        {
            case Key.Down:
                viewModel.OpenSettingsSearchPopup();
                SelectSettingsSearchResult(1);
                e.Handled = true;
                break;
            case Key.Up:
                viewModel.OpenSettingsSearchPopup();
                SelectSettingsSearchResult(-1);
                e.Handled = true;
                break;
            case Key.Enter:
                if (GlobalSettingsSearchResultsList.SelectedItem is null
                    && GlobalSettingsSearchResultsList.Items.Count > 0)
                {
                    GlobalSettingsSearchResultsList.SelectedIndex = 0;
                }

                if (GlobalSettingsSearchResultsList.SelectedItem
                    is SettingsSearchResultViewModel selectedResult)
                {
                    viewModel.NavigateToSettingsSearchResult(selectedResult);
                    e.Handled = true;
                }
                break;
            case Key.Escape:
                viewModel.ClearSettingsSearch();
                e.Handled = true;
                break;
        }
    }

    private void GlobalSettingsSearchResultsList_MouseLeftButtonUp(
        object sender,
        MouseButtonEventArgs e)
    {
        if (DataContext is SettingsWindowViewModel viewModel
            && GlobalSettingsSearchResultsList.SelectedItem
                is SettingsSearchResultViewModel selectedResult)
        {
            viewModel.NavigateToSettingsSearchResult(selectedResult);
        }
    }

    private void SelectSettingsSearchResult(int direction)
    {
        int itemCount = GlobalSettingsSearchResultsList.Items.Count;
        if (itemCount == 0)
            return;

        int nextIndex = GlobalSettingsSearchResultsList.SelectedIndex;
        nextIndex = nextIndex < 0
            ? direction > 0 ? 0 : itemCount - 1
            : Math.Clamp(nextIndex + direction, 0, itemCount - 1);

        GlobalSettingsSearchResultsList.SelectedIndex = nextIndex;
        GlobalSettingsSearchResultsList.ScrollIntoView(
            GlobalSettingsSearchResultsList.SelectedItem);
    }

    private async void ViewModel_SettingsSearchNavigationRequested(
        object? sender,
        SettingsSearchNavigationRequestedEventArgs e)
    {
        await Dispatcher.InvokeAsync(
            SettingsPageContent.UpdateLayout,
            DispatcherPriority.Loaded);
        await Dispatcher.InvokeAsync(
            SettingsPageContent.UpdateLayout,
            DispatcherPriority.Render);

        FrameworkElement? target = FindSettingsSearchTarget(
            SettingsPageContent,
            e.TargetId);
        if (target is null)
            return;

        ScrollSettingsTargetIntoView(target);
        await Dispatcher.InvokeAsync(target.UpdateLayout, DispatcherPriority.Render);
        HighlightSettingsSearchTarget(target);
    }

    private static FrameworkElement? FindSettingsSearchTarget(
        DependencyObject root,
        string targetId)
    {
        if (root is FrameworkElement element
            && string.Equals(
                SettingsSearch.GetTargetId(element),
                targetId,
                StringComparison.Ordinal))
        {
            return element;
        }

        int childCount = VisualTreeHelper.GetChildrenCount(root);
        for (int index = 0; index < childCount; index++)
        {
            FrameworkElement? result = FindSettingsSearchTarget(
                VisualTreeHelper.GetChild(root, index),
                targetId);
            if (result is not null)
                return result;
        }

        return null;
    }

    private static void ScrollSettingsTargetIntoView(FrameworkElement target)
    {
        ScrollViewer? scrollViewer = FindVisualAncestor<ScrollViewer>(target);
        if (scrollViewer is null)
        {
            target.BringIntoView();
            return;
        }

        try
        {
            Point position = target.TransformToAncestor(scrollViewer).Transform(new Point());
            double targetOffset = Math.Clamp(
                scrollViewer.VerticalOffset + position.Y - 12,
                0,
                scrollViewer.ScrollableHeight);
            scrollViewer.ScrollToVerticalOffset(targetOffset);
            scrollViewer.UpdateLayout();
        }
        catch (InvalidOperationException)
        {
            target.BringIntoView();
        }
    }

    private void HighlightSettingsSearchTarget(FrameworkElement target)
    {
        AdornerLayer? layer = AdornerLayer.GetAdornerLayer(target);
        if (layer is null
            || TryFindResource("Brush.Accent.Primary") is not Brush accentBrush)
        {
            return;
        }

        SettingsSearchHighlightAdorner adorner = new(target, accentBrush);
        layer.Add(adorner);
        adorner.Begin(layer);
    }

    private static T? FindVisualAncestor<T>(DependencyObject element)
        where T : DependencyObject
    {
        DependencyObject? current = VisualTreeHelper.GetParent(element);
        while (current is not null)
        {
            if (current is T match)
                return match;

            current = VisualTreeHelper.GetParent(current);
        }

        return null;
    }

    internal void NotifySettingsApplied(DraftSettings settings)
    {
        SettingsApplied?.Invoke(this, new SettingsAppliedEventArgs(settings));
    }

    private void ViewModel_CloseRequested(object? sender, EventArgs e)
    {
        Close();
    }
}
