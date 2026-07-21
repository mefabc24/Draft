using System.Diagnostics.CodeAnalysis;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using Draft.Settings.ViewModels.Pages;

namespace Draft.Settings.Controls;

public partial class MenuCustomizationSettingCard : UserControl
{
    private Point _dragStartPoint;
    private bool _isDragPending;

    public MenuCustomizationSettingCard()
    {
        InitializeComponent();
    }

    private void DragHandle_PreviewMouseLeftButtonDown(
        object sender,
        MouseButtonEventArgs e)
    {
        _dragStartPoint = e.GetPosition(this);
        _isDragPending = true;
    }

    private void DragHandle_PreviewKeyDown(object sender, KeyEventArgs e)
    {
        if (DataContext is not MenuCustomizationItemViewModel item
            || (Keyboard.Modifiers & ModifierKeys.Alt) == 0)
        {
            return;
        }

        Key pressedKey = e.Key == Key.System ? e.SystemKey : e.Key;
        int offset = pressedKey switch
        {
            Key.Up => -1,
            Key.Down => 1,
            _ => 0,
        };

        if (offset == 0 || !item.Owner.MoveItemByOffset(item, offset))
            return;

        e.Handled = true;
        DragHandle.Focus();
    }

    private void DragHandle_PreviewMouseLeftButtonUp(
        object sender,
        MouseButtonEventArgs e)
    {
        _isDragPending = false;
    }

    private void DragHandle_PreviewMouseMove(object sender, MouseEventArgs e)
    {
        if (!_isDragPending
            || e.LeftButton != MouseButtonState.Pressed
            || DataContext is not MenuCustomizationItemViewModel item)
        {
            return;
        }

        Point currentPoint = e.GetPosition(this);
        bool exceededHorizontalThreshold = Math.Abs(
            currentPoint.X - _dragStartPoint.X) >= SystemParameters.MinimumHorizontalDragDistance;
        bool exceededVerticalThreshold = Math.Abs(
            currentPoint.Y - _dragStartPoint.Y) >= SystemParameters.MinimumVerticalDragDistance;

        if (!exceededHorizontalThreshold && !exceededVerticalThreshold)
            return;

        _isDragPending = false;
        DataObject data = new(typeof(MenuCustomizationItemViewModel), item);
        DragDrop.DoDragDrop(DragHandle, data, DragDropEffects.Move);
    }

    private void Card_DragOver(object sender, DragEventArgs e)
    {
        if (!TryGetDraggedItem(e.Data, out MenuCustomizationItemViewModel? source)
            || DataContext is not MenuCustomizationItemViewModel target
            || !source.Owner.CanMoveItemRelativeTo(source, target))
        {
            e.Effects = DragDropEffects.None;
            e.Handled = true;
            return;
        }

        e.Effects = DragDropEffects.Move;
        CardBorder.Opacity = 0.72;
        e.Handled = true;
    }

    private void Card_DragLeave(object sender, DragEventArgs e)
    {
        CardBorder.Opacity = 1;
    }

    private void Card_Drop(object sender, DragEventArgs e)
    {
        CardBorder.Opacity = 1;

        if (!TryGetDraggedItem(e.Data, out MenuCustomizationItemViewModel? source)
            || DataContext is not MenuCustomizationItemViewModel target
            || !source.Owner.CanMoveItemRelativeTo(source, target))
        {
            e.Effects = DragDropEffects.None;
            e.Handled = true;
            return;
        }

        bool insertAfter = e.GetPosition(this).Y >= ActualHeight / 2;
        source.Owner.MoveItemRelativeTo(source, target, insertAfter);
        e.Effects = DragDropEffects.Move;
        e.Handled = true;
    }

    internal static bool TryGetDraggedItem(
        IDataObject data,
        [NotNullWhen(true)] out MenuCustomizationItemViewModel? item)
    {
        item = data.GetDataPresent(typeof(MenuCustomizationItemViewModel))
            ? data.GetData(typeof(MenuCustomizationItemViewModel))
                as MenuCustomizationItemViewModel
            : null;

        return item is not null;
    }
}
