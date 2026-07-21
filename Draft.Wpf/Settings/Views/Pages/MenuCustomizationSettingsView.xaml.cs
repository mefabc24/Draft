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
            || !MenuCustomizationSettingCard.TryGetDragData(
                e.Data,
                out MenuCustomizationDragData? dragData)
            || !ReferenceEquals(dragData.Item.Owner, page))
        {
            return;
        }

        dragData.SourceCard.UpdateDragPreviewPosition();
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
            out ItemsControl? section,
            out MenuCustomizationSettingsPageViewModel? page,
            out MenuCustomizationDragData? dragData,
            out string placement)
            || !page.CanReorderItem(dragData.Item, placement))
        {
            e.Effects = DragDropEffects.None;
            e.Handled = true;
            return;
        }

        UpdateLiveOrder(section, page, dragData, placement, e.GetPosition(section));
        e.Effects = DragDropEffects.Move;
        e.Handled = true;
    }

    private void Section_Drop(object sender, DragEventArgs e)
    {
        if (!TryGetSectionDropData(
            sender,
            e.Data,
            out ItemsControl? section,
            out MenuCustomizationSettingsPageViewModel? page,
            out MenuCustomizationDragData? dragData,
            out string placement)
            || !page.CanReorderItem(dragData.Item, placement))
        {
            e.Effects = DragDropEffects.None;
            e.Handled = true;
            return;
        }

        UpdateLiveOrder(section, page, dragData, placement, e.GetPosition(section));
        e.Effects = DragDropEffects.Move;
        e.Handled = true;
    }

    private static void UpdateLiveOrder(
        ItemsControl section,
        MenuCustomizationSettingsPageViewModel page,
        MenuCustomizationDragData dragData,
        string placement,
        Point pointer)
    {
        int destinationIndex = GetDestinationIndex(
            section,
            dragData.Item,
            pointer.Y);

        if (page.GetItemIndex(dragData.Item) == destinationIndex)
        {
            dragData.SourceCard.UpdateDragPreviewPosition();
            return;
        }

        Dictionary<MenuCustomizationItemViewModel, double> previousPositions =
            CaptureCardPositions(section);

        foreach (MenuCustomizationSettingCard card
            in FindVisualChildren<MenuCustomizationSettingCard>(section))
        {
            card.StopReorderAnimation();
        }

        if (!page.MoveItemToIndex(dragData.Item, placement, destinationIndex))
            return;

        section.UpdateLayout();

        foreach (MenuCustomizationSettingCard card
            in FindVisualChildren<MenuCustomizationSettingCard>(section))
        {
            if (card.DataContext is not MenuCustomizationItemViewModel item
                || ReferenceEquals(item, dragData.Item)
                || !previousPositions.TryGetValue(item, out double previousTop))
            {
                continue;
            }

            double currentTop = card.TranslatePoint(new Point(), section).Y;
            card.AnimateReorderFrom(previousTop - currentTop);
        }

        dragData.SourceCard.UpdateDragPreviewPosition();
    }

    private static int GetDestinationIndex(
        ItemsControl section,
        MenuCustomizationItemViewModel draggedItem,
        double pointerY)
    {
        int destinationIndex = 0;

        for (int index = 0; index < section.Items.Count; index++)
        {
            if (ReferenceEquals(section.Items[index], draggedItem))
                continue;

            if (section.ItemContainerGenerator.ContainerFromIndex(index)
                    is not FrameworkElement container)
            {
                continue;
            }

            double containerTop = container.TranslatePoint(new Point(), section).Y;
            double containerMiddle = containerTop + (container.ActualHeight / 2);

            if (pointerY < containerMiddle)
                break;

            destinationIndex++;
        }

        return Math.Clamp(destinationIndex, 0, Math.Max(0, section.Items.Count - 1));
    }

    private static Dictionary<MenuCustomizationItemViewModel, double> CaptureCardPositions(
        ItemsControl section)
    {
        Dictionary<MenuCustomizationItemViewModel, double> positions = new();

        foreach (MenuCustomizationSettingCard card
            in FindVisualChildren<MenuCustomizationSettingCard>(section))
        {
            if (card.DataContext is MenuCustomizationItemViewModel item)
            {
                positions[item] = card.TranslatePoint(new Point(), section).Y;
            }
        }

        return positions;
    }

    private static IEnumerable<T> FindVisualChildren<T>(DependencyObject parent)
        where T : DependencyObject
    {
        int childCount = System.Windows.Media.VisualTreeHelper.GetChildrenCount(parent);

        for (int index = 0; index < childCount; index++)
        {
            DependencyObject child = System.Windows.Media.VisualTreeHelper.GetChild(parent, index);

            if (child is T match)
                yield return match;

            foreach (T descendant in FindVisualChildren<T>(child))
                yield return descendant;
        }
    }

    private bool TryGetSectionDropData(
        object sender,
        IDataObject data,
        [NotNullWhen(true)] out ItemsControl? section,
        [NotNullWhen(true)] out MenuCustomizationSettingsPageViewModel? page,
        [NotNullWhen(true)] out MenuCustomizationDragData? dragData,
        out string placement)
    {
        section = sender as ItemsControl;
        page = DataContext as MenuCustomizationSettingsPageViewModel;
        dragData = null;
        placement = section is not null
            ? section.Tag as string ?? string.Empty
            : string.Empty;

        return section is not null
            && page is not null
            && !string.IsNullOrWhiteSpace(placement)
            && MenuCustomizationSettingCard.TryGetDragData(data, out dragData)
            && ReferenceEquals(dragData.Item.Owner, page);
    }
}
