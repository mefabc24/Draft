using System.Diagnostics.CodeAnalysis;
using System.Windows;
using System.Windows.Controls;
using Draft.Settings.Controls;
using Draft.Settings.ViewModels.Pages;

namespace Draft.Settings.Views.Pages;

public partial class MenuCustomizationSettingsView : UserControl
{
    private const double AutoScrollEdgeSize = 48;
    private const double AutoScrollStep = 14;

    public MenuCustomizationSettingsView()
    {
        InitializeComponent();
    }

    private void View_PreviewDragOver(object sender, DragEventArgs e)
    {
        if (DataContext is not MenuCustomizationSettingsPageViewModel page
            || !MenuCustomizationSettingCard.TryGetDraggedItem(
                e.Data,
                out MenuCustomizationItemViewModel? item)
            || !ReferenceEquals(item.Owner, page))
        {
            return;
        }

        Point pointer = e.GetPosition(SettingsScrollViewer);

        if (pointer.Y < AutoScrollEdgeSize)
        {
            SettingsScrollViewer.ScrollToVerticalOffset(
                Math.Max(
                    0,
                    SettingsScrollViewer.VerticalOffset - AutoScrollStep));
        }
        else if (
            pointer.Y > SettingsScrollViewer.ViewportHeight - AutoScrollEdgeSize)
        {
            SettingsScrollViewer.ScrollToVerticalOffset(
                Math.Min(
                    SettingsScrollViewer.ScrollableHeight,
                    SettingsScrollViewer.VerticalOffset + AutoScrollStep));
        }
    }

    private void Section_DragOver(object sender, DragEventArgs e)
    {
        if (!TryGetSectionDropData(
            sender,
            e.Data,
            out MenuCustomizationSettingsPageViewModel? page,
            out MenuCustomizationItemViewModel? item,
            out string placement)
            || !page.CanMoveItemToSectionEnd(item, placement))
        {
            e.Effects = DragDropEffects.None;
            return;
        }

        e.Effects = DragDropEffects.Move;
        e.Handled = true;
    }

    private void Section_Drop(object sender, DragEventArgs e)
    {
        if (!TryGetSectionDropData(
            sender,
            e.Data,
            out MenuCustomizationSettingsPageViewModel? page,
            out MenuCustomizationItemViewModel? item,
            out string placement)
            || !page.CanMoveItemToSectionEnd(item, placement))
        {
            e.Effects = DragDropEffects.None;
            return;
        }

        page.MoveItemToSectionEnd(item, placement);
        e.Effects = DragDropEffects.Move;
        e.Handled = true;
    }

    private bool TryGetSectionDropData(
        object sender,
        IDataObject data,
        [NotNullWhen(true)] out MenuCustomizationSettingsPageViewModel? page,
        [NotNullWhen(true)] out MenuCustomizationItemViewModel? item,
        out string placement)
    {
        page = DataContext as MenuCustomizationSettingsPageViewModel;
        item = null;
        placement = sender is FrameworkElement element
            ? element.Tag as string ?? string.Empty
            : string.Empty;

        return page is not null
            && !string.IsNullOrWhiteSpace(placement)
            && MenuCustomizationSettingCard.TryGetDraggedItem(data, out item);
    }
}
