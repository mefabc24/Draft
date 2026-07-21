using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Threading;
using Draft.Settings.Controls;
using Draft.Settings.Models;
using Draft.Settings.ViewModels.Pages;

namespace Draft.Settings.Views.Pages;

public partial class MenuCustomizationSettingsView : UserControl
{
    private const double AutoScrollEdgeSize = 48;
    private const double AutoScrollStep = 14;
    private const double MouseWheelScrollFactor = 0.34;

    private readonly DispatcherTimer _autoScrollTimer;
    private DragSession? _dragSession;
    private Window? _dragWindow;
    private Cursor? _previousCursor;

    public MenuCustomizationSettingsView()
    {
        InitializeComponent();
        _autoScrollTimer = new DispatcherTimer
        {
            Interval = TimeSpan.FromMilliseconds(30),
        };
        _autoScrollTimer.Tick += AutoScrollTimer_Tick;
    }

    private void Card_DragRequested(
        object sender,
        MenuCustomizationDragRequestedEventArgs e)
    {
        if (_dragSession is not null
            || DataContext is not MenuCustomizationSettingsPageViewModel page
            || !ReferenceEquals(e.Item.Owner, page))
        {
            return;
        }

        int originalIndex = page.GetItemIndex(e.Item);

        if (originalIndex < 0)
            return;

        _dragSession = new DragSession(
            e.SourceCard,
            e.Item,
            e.GrabOffset,
            originalIndex);
        e.SourceCard.SetDragPlaceholder(true);

        DragPreviewImage.Source = e.Preview;
        DragPreviewCard.Width = e.PreviewSize.Width;
        DragPreviewCard.Height = e.PreviewSize.Height;
        DragPreviewCard.Visibility = Visibility.Visible;

        _previousCursor = Cursor;
        Cursor = Cursors.SizeAll;
        _dragWindow = Window.GetWindow(this);

        if (_dragWindow is not null)
            _dragWindow.PreviewKeyDown += DragWindow_PreviewKeyDown;

        UpdateDrag(Mouse.GetPosition(this), allowAutoScroll: false);

        if (!Mouse.Capture(this, CaptureMode.Element))
        {
            EndDrag(cancel: true);
            return;
        }

        _autoScrollTimer.Start();
        e.Handled = true;
    }

    private void View_PreviewMouseMove(object sender, MouseEventArgs e)
    {
        if (_dragSession is null)
            return;

        if (e.LeftButton != MouseButtonState.Pressed)
        {
            EndDrag(cancel: false);
            return;
        }

        UpdateDrag(e.GetPosition(this), allowAutoScroll: true);
        e.Handled = true;
    }

    private void View_PreviewMouseLeftButtonUp(
        object sender,
        MouseButtonEventArgs e)
    {
        if (_dragSession is null)
            return;

        UpdateDrag(e.GetPosition(this), allowAutoScroll: false);
        EndDrag(cancel: false);
        e.Handled = true;
    }

    private void View_PreviewMouseWheel(object sender, MouseWheelEventArgs e)
    {
        if (_dragSession is null)
            return;

        double requestedOffset = SettingsScrollViewer.VerticalOffset
            - (e.Delta * MouseWheelScrollFactor);
        SettingsScrollViewer.ScrollToVerticalOffset(
            Math.Clamp(
                requestedOffset,
                0,
                SettingsScrollViewer.ScrollableHeight));
        SettingsScrollViewer.UpdateLayout();
        UpdateDrag(e.GetPosition(this), allowAutoScroll: false);
        e.Handled = true;
    }

    private void View_LostMouseCapture(object sender, MouseEventArgs e)
    {
        if (_dragSession is not null
            && ReferenceEquals(e.OriginalSource, this)
            && !ReferenceEquals(Mouse.Captured, this))
        {
            EndDrag(cancel: true);
        }
    }

    private void View_Unloaded(object sender, RoutedEventArgs e)
    {
        if (_dragSession is not null)
            EndDrag(cancel: true);
    }

    private void DragWindow_PreviewKeyDown(object sender, KeyEventArgs e)
    {
        Key pressedKey = e.Key == Key.System ? e.SystemKey : e.Key;

        if (_dragSession is null || pressedKey != Key.Escape)
            return;

        EndDrag(cancel: true);
        e.Handled = true;
    }

    private void AutoScrollTimer_Tick(object? sender, EventArgs e)
    {
        if (_dragSession is null)
        {
            _autoScrollTimer.Stop();
            return;
        }

        if (Mouse.LeftButton != MouseButtonState.Pressed)
        {
            EndDrag(cancel: false);
            return;
        }

        UpdateDrag(Mouse.GetPosition(this), allowAutoScroll: true);
    }

    private void UpdateDrag(Point pointer, bool allowAutoScroll)
    {
        if (_dragSession is not DragSession session)
            return;

        Canvas.SetLeft(
            DragPreviewCard,
            pointer.X - session.GrabOffset.X);
        Canvas.SetTop(
            DragPreviewCard,
            pointer.Y - session.GrabOffset.Y);

        if (allowAutoScroll && AutoScroll(pointer))
            SettingsScrollViewer.UpdateLayout();

        ItemsControl section = GetSection(session.Item.Placement);
        Point sectionPointer = TranslatePoint(pointer, section);

        if (sectionPointer.Y < 0 || sectionPointer.Y > section.ActualHeight)
            return;

        if (DataContext is MenuCustomizationSettingsPageViewModel page)
        {
            UpdateLiveOrder(
                section,
                page,
                session,
                session.Item.Placement,
                sectionPointer);
        }
    }

    private bool AutoScroll(Point pointer)
    {
        Point scrollPointer = TranslatePoint(pointer, SettingsScrollViewer);
        double requestedOffset = SettingsScrollViewer.VerticalOffset;

        if (scrollPointer.Y < AutoScrollEdgeSize)
        {
            requestedOffset -= AutoScrollStep;
        }
        else if (scrollPointer.Y
            > SettingsScrollViewer.ViewportHeight - AutoScrollEdgeSize)
        {
            requestedOffset += AutoScrollStep;
        }
        else
        {
            return false;
        }

        double nextOffset = Math.Clamp(
            requestedOffset,
            0,
            SettingsScrollViewer.ScrollableHeight);

        if (Math.Abs(nextOffset - SettingsScrollViewer.VerticalOffset) < 0.1)
            return false;

        SettingsScrollViewer.ScrollToVerticalOffset(nextOffset);
        return true;
    }

    private void EndDrag(bool cancel)
    {
        if (_dragSession is not DragSession session)
            return;

        _dragSession = null;
        _autoScrollTimer.Stop();

        if (cancel)
        {
            session.Item.Owner.MoveItemToIndex(
                session.Item,
                session.Item.Placement,
                session.OriginalIndex);
        }

        session.SourceCard.SetDragPlaceholder(false);
        DragPreviewCard.Visibility = Visibility.Collapsed;
        DragPreviewImage.Source = null;

        if (_dragWindow is not null)
            _dragWindow.PreviewKeyDown -= DragWindow_PreviewKeyDown;

        _dragWindow = null;
        Cursor = _previousCursor;
        _previousCursor = null;

        if (ReferenceEquals(Mouse.Captured, this))
            Mouse.Capture(null);
    }

    private ItemsControl GetSection(string placement)
        => MenuCustomizationPlacement.Normalize(placement) switch
        {
            MenuCustomizationPlacement.Overflow => OverflowItemsControl,
            MenuCustomizationPlacement.Disabled => DisabledItemsControl,
            _ => VisibleItemsControl,
        };

    private static void UpdateLiveOrder(
        ItemsControl section,
        MenuCustomizationSettingsPageViewModel page,
        DragSession session,
        string placement,
        Point pointer)
    {
        int destinationIndex = GetDestinationIndex(
            section,
            session.Item,
            pointer.Y);

        if (page.GetItemIndex(session.Item) == destinationIndex)
            return;

        Dictionary<MenuCustomizationItemViewModel, double> previousPositions =
            CaptureCardPositions(section);

        foreach (MenuCustomizationSettingCard card
            in FindVisualChildren<MenuCustomizationSettingCard>(section))
        {
            card.StopReorderAnimation();
        }

        if (!page.MoveItemToIndex(session.Item, placement, destinationIndex))
            return;

        section.UpdateLayout();

        foreach (MenuCustomizationSettingCard card
            in FindVisualChildren<MenuCustomizationSettingCard>(section))
        {
            if (card.DataContext is not MenuCustomizationItemViewModel item
                || ReferenceEquals(item, session.Item)
                || !previousPositions.TryGetValue(item, out double previousTop))
            {
                continue;
            }

            double currentTop = card.TranslatePoint(new Point(), section).Y;
            card.AnimateReorderFrom(previousTop - currentTop);
        }
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
                positions[item] = card.TranslatePoint(new Point(), section).Y;
        }

        return positions;
    }

    private static IEnumerable<T> FindVisualChildren<T>(DependencyObject parent)
        where T : DependencyObject
    {
        int childCount = VisualTreeHelper.GetChildrenCount(parent);

        for (int index = 0; index < childCount; index++)
        {
            DependencyObject child = VisualTreeHelper.GetChild(parent, index);

            if (child is T match)
                yield return match;

            foreach (T descendant in FindVisualChildren<T>(child))
                yield return descendant;
        }
    }

    private sealed record DragSession(
        MenuCustomizationSettingCard SourceCard,
        MenuCustomizationItemViewModel Item,
        Point GrabOffset,
        int OriginalIndex);
}
