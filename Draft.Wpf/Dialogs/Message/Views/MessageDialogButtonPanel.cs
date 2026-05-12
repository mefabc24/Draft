using System.Windows;
using System.Windows.Controls;

namespace Draft.Dialogs.Message.Views;

public sealed class MessageDialogButtonPanel : Panel
{
    public static readonly DependencyProperty GapProperty = DependencyProperty.Register(
        nameof(Gap),
        typeof(double),
        typeof(MessageDialogButtonPanel),
        new FrameworkPropertyMetadata(12d, FrameworkPropertyMetadataOptions.AffectsMeasure));

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
        double maxChildWidth = 0;

        foreach (UIElement child in InternalChildren)
        {
            child.Measure(new Size(childWidth, availableSize.Height));
            desiredHeight = Math.Max(desiredHeight, child.DesiredSize.Height);
            maxChildWidth = Math.Max(maxChildWidth, child.DesiredSize.Width);
        }

        double desiredWidth = (maxChildWidth * childCount) + totalGap;

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
