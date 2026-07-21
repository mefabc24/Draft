using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Imaging;
using Draft.Settings.ViewModels.Pages;

namespace Draft.Settings.Controls;

public partial class MenuCustomizationSettingCard : UserControl
{
    public static readonly RoutedEvent DragRequestedEvent = EventManager.RegisterRoutedEvent(
        nameof(DragRequested),
        RoutingStrategy.Bubble,
        typeof(EventHandler<MenuCustomizationDragRequestedEventArgs>),
        typeof(MenuCustomizationSettingCard));

    private Point _dragStartPoint;
    private bool _isDragPending;

    public MenuCustomizationSettingCard()
    {
        InitializeComponent();
    }

    public event EventHandler<MenuCustomizationDragRequestedEventArgs> DragRequested
    {
        add => AddHandler(DragRequestedEvent, value);
        remove => RemoveHandler(DragRequestedEvent, value);
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
        ImageSource? preview = CreateDragPreview();

        if (preview is null)
            return;

        RaiseEvent(new MenuCustomizationDragRequestedEventArgs(
            this,
            item,
            preview,
            RenderSize,
            _dragStartPoint));
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

    internal void SetDragPlaceholder(bool isVisible)
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

public sealed class MenuCustomizationDragRequestedEventArgs : RoutedEventArgs
{
    internal MenuCustomizationDragRequestedEventArgs(
        MenuCustomizationSettingCard sourceCard,
        MenuCustomizationItemViewModel item,
        ImageSource preview,
        Size previewSize,
        Point grabOffset)
        : base(MenuCustomizationSettingCard.DragRequestedEvent, sourceCard)
    {
        SourceCard = sourceCard;
        Item = item;
        Preview = preview;
        PreviewSize = previewSize;
        GrabOffset = grabOffset;
    }

    public MenuCustomizationSettingCard SourceCard { get; }

    public MenuCustomizationItemViewModel Item { get; }

    public ImageSource Preview { get; }

    public Size PreviewSize { get; }

    public Point GrabOffset { get; }
}
