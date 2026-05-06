using System.Windows;
using System.Windows.Controls;

namespace Draft.Dialogs.Views;

public sealed class DraftDialogButtonPanel : Panel
{
    public static readonly DependencyProperty GapProperty = DependencyProperty.Register(
        nameof(Gap),
        typeof(double),
        typeof(DraftDialogButtonPanel),
        new FrameworkPropertyMetadata(8d, FrameworkPropertyMetadataOptions.AffectsMeasure));

    public double Gap
    {
        get => (double)GetValue(GapProperty);
        set => SetValue(GapProperty, value);
    }

    protected override Size MeasureOverride(Size availableSize)
    {
        int childCount = InternalChildren.Count;
        if (childCount == 0)
            return new Size();

        double totalGap = Gap * Math.Max(0, childCount - 1);
        double availableWidth = double.IsInfinity(availableSize.Width)
            ? double.PositiveInfinity
            : Math.Max(0, availableSize.Width - totalGap);
        double childWidth = double.IsInfinity(availableWidth)
            ? double.PositiveInfinity
            : availableWidth / childCount;
        double desiredHeight = 0;
        double desiredWidth = totalGap;

        foreach (UIElement child in InternalChildren)
        {
            child.Measure(new Size(childWidth, availableSize.Height));
            desiredHeight = Math.Max(desiredHeight, child.DesiredSize.Height);
            desiredWidth += double.IsInfinity(childWidth)
                ? child.DesiredSize.Width
                : childWidth;
        }

        if (!double.IsInfinity(availableSize.Width))
            desiredWidth = availableSize.Width;

        return new Size(desiredWidth, desiredHeight);
    }

    protected override Size ArrangeOverride(Size finalSize)
    {
        int childCount = InternalChildren.Count;
        if (childCount == 0)
            return finalSize;

        double totalGap = Gap * Math.Max(0, childCount - 1);
        double childWidth = Math.Max(0, (finalSize.Width - totalGap) / childCount);
        double x = 0;

        foreach (UIElement child in InternalChildren)
        {
            child.Arrange(new Rect(x, 0, childWidth, finalSize.Height));
            x += childWidth + Gap;
        }

        return finalSize;
    }
}
