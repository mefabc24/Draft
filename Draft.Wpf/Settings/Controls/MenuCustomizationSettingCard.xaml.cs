using System.Diagnostics.CodeAnalysis;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Imaging;
using Draft.Settings.ViewModels.Pages;

namespace Draft.Settings.Controls;

public partial class MenuCustomizationSettingCard : UserControl
{
    private Point _dragStartPoint;
    private bool _isDragPending;
    private MenuCustomizationDragAdorner? _dragAdorner;

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
        int originalIndex = item.Owner.GetItemIndex(item);
        ImageSource? preview = CreateDragPreview();
        AdornerLayer? adornerLayer = AdornerLayer.GetAdornerLayer(this);

        if (originalIndex < 0 || preview is null || adornerLayer is null)
            return;

        MenuCustomizationDragData dragData = new(item, this);
        DataObject data = new();
        data.SetData(typeof(MenuCustomizationDragData), dragData);
        data.SetData(typeof(MenuCustomizationItemViewModel), item);

        try
        {
            _dragAdorner = new MenuCustomizationDragAdorner(
                this,
                preview,
                RenderSize,
                _dragStartPoint);
            adornerLayer.Add(_dragAdorner);
            SetDragPlaceholder(true);
            UpdateDragPreviewPosition();

            DragDropEffects result = DragDrop.DoDragDrop(
                DragHandle,
                data,
                DragDropEffects.Move);

            if (result != DragDropEffects.Move)
            {
                item.Owner.MoveItemToIndex(
                    item,
                    item.Placement,
                    originalIndex);
            }
        }
        finally
        {
            SetDragPlaceholder(false);

            if (_dragAdorner is not null)
            {
                adornerLayer.Remove(_dragAdorner);
                _dragAdorner = null;
            }
        }
    }

    private void DragHandle_GiveFeedback(object sender, GiveFeedbackEventArgs e)
    {
        UpdateDragPreviewPosition();
        e.UseDefaultCursors = false;
        Mouse.SetCursor(Cursors.SizeAll);
        e.Handled = true;
    }

    internal void UpdateDragPreviewPosition()
    {
        _dragAdorner?.UpdatePosition(Mouse.GetPosition(this));
    }

    internal void StopReorderAnimation()
    {
        ReorderTransform.BeginAnimation(
            TranslateTransform.YProperty,
            null);
        ReorderTransform.Y = 0;
    }

    internal void AnimateReorderFrom(double verticalOffset)
    {
        if (Math.Abs(verticalOffset) < 0.5)
            return;

        DoubleAnimation animation = new(verticalOffset, 0, TimeSpan.FromMilliseconds(155))
        {
            EasingFunction = new CubicEase
            {
                EasingMode = EasingMode.EaseOut,
            },
        };

        ReorderTransform.BeginAnimation(
            TranslateTransform.YProperty,
            animation,
            HandoffBehavior.SnapshotAndReplace);
    }

    internal static bool TryGetDragData(
        IDataObject data,
        [NotNullWhen(true)] out MenuCustomizationDragData? dragData)
    {
        dragData = data.GetDataPresent(typeof(MenuCustomizationDragData))
            ? data.GetData(typeof(MenuCustomizationDragData))
                as MenuCustomizationDragData
            : null;

        return dragData is not null;
    }

    private ImageSource? CreateDragPreview()
    {
        if (ActualWidth <= 0 || ActualHeight <= 0)
            return null;

        DpiScale dpi = VisualTreeHelper.GetDpi(this);
        RenderTargetBitmap bitmap = new(
            Math.Max(1, (int)Math.Ceiling(ActualWidth * dpi.DpiScaleX)),
            Math.Max(1, (int)Math.Ceiling(ActualHeight * dpi.DpiScaleY)),
            dpi.PixelsPerInchX,
            dpi.PixelsPerInchY,
            PixelFormats.Pbgra32);
        bitmap.Render(this);
        bitmap.Freeze();
        return bitmap;
    }

    private void SetDragPlaceholder(bool isVisible)
    {
        CardBorder.Visibility = isVisible
            ? Visibility.Hidden
            : Visibility.Visible;
        DropPlaceholder.Visibility = isVisible
            ? Visibility.Visible
            : Visibility.Collapsed;

        DropPlaceholder.BeginAnimation(UIElement.OpacityProperty, null);
        DropPlaceholder.Opacity = isVisible ? 0 : 1;

        if (!isVisible)
            return;

        DropPlaceholder.BeginAnimation(
            UIElement.OpacityProperty,
            new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(110))
            {
                EasingFunction = new CubicEase
                {
                    EasingMode = EasingMode.EaseOut,
                },
            });
    }
}

internal sealed class MenuCustomizationDragData(
    MenuCustomizationItemViewModel item,
    MenuCustomizationSettingCard sourceCard)
{
    public MenuCustomizationItemViewModel Item { get; } = item;

    public MenuCustomizationSettingCard SourceCard { get; } = sourceCard;
}
