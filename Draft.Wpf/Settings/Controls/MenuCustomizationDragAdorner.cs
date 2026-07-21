using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Media;
using System.Windows.Media.Effects;

namespace Draft.Settings.Controls;

internal sealed class MenuCustomizationDragAdorner : Adorner
{
    private readonly VisualCollection _visuals;
    private readonly Border _preview;
    private readonly Point _grabOffset;
    private double _left;
    private double _top;

    public MenuCustomizationDragAdorner(
        FrameworkElement adornedElement,
        ImageSource preview,
        Size previewSize,
        Point grabOffset)
        : base(adornedElement)
    {
        _grabOffset = grabOffset;
        IsHitTestVisible = false;

        _preview = new Border
        {
            Width = previewSize.Width,
            Height = previewSize.Height,
            Background = GetBrush(adornedElement, "Brush.Background.Surface"),
            BorderBrush = GetBrush(adornedElement, "Brush.Border.Input"),
            BorderThickness = new Thickness(1),
            CornerRadius = new CornerRadius(6),
            Opacity = 0.76,
            SnapsToDevicePixels = true,
            Effect = new DropShadowEffect
            {
                BlurRadius = 18,
                Direction = 270,
                Opacity = 0.34,
                ShadowDepth = 5,
                Color = Colors.Black,
            },
            Child = new Image
            {
                Source = preview,
                Stretch = Stretch.Fill,
                IsHitTestVisible = false,
            },
        };

        _visuals = new VisualCollection(this)
        {
            _preview,
        };
    }

    protected override int VisualChildrenCount => _visuals?.Count ?? 0;

    protected override Visual GetVisualChild(int index)
        => _visuals is not null
            ? _visuals[index]
            : throw new ArgumentOutOfRangeException(nameof(index));

    public void UpdatePosition(Point pointer)
    {
        _left = pointer.X - _grabOffset.X;
        _top = pointer.Y - _grabOffset.Y;
        (Parent as AdornerLayer)?.Update(AdornedElement);
    }

    public override GeneralTransform GetDesiredTransform(GeneralTransform transform)
    {
        GeneralTransformGroup transforms = new();
        transforms.Children.Add(base.GetDesiredTransform(transform));
        transforms.Children.Add(new TranslateTransform(_left, _top));
        return transforms;
    }

    protected override Size MeasureOverride(Size constraint)
    {
        _preview.Measure(new Size(_preview.Width, _preview.Height));
        return _preview.DesiredSize;
    }

    protected override Size ArrangeOverride(Size finalSize)
    {
        _preview.Arrange(new Rect(new Point(), _preview.DesiredSize));
        return finalSize;
    }

    private static Brush GetBrush(FrameworkElement element, string resourceKey)
        => element.TryFindResource(resourceKey) as Brush ?? Brushes.Transparent;
}
