using System.Windows;
using System.Windows.Documents;
using System.Windows.Media;
using System.Windows.Media.Animation;

namespace Draft.Settings.Controls;

internal sealed class SettingsSearchHighlightAdorner : Adorner
{
    private readonly Brush _fill;
    private readonly Pen _outline;

    public SettingsSearchHighlightAdorner(UIElement adornedElement, Brush accentBrush)
        : base(adornedElement)
    {
        IsHitTestVisible = false;
        Opacity = 0;

        _fill = accentBrush.Clone();
        _fill.Opacity = 0.14;
        _fill.Freeze();

        Brush outlineBrush = accentBrush.Clone();
        outlineBrush.Opacity = 0.48;
        outlineBrush.Freeze();
        _outline = new Pen(outlineBrush, 1);
        _outline.Freeze();
    }

    public void Begin(AdornerLayer layer)
    {
        DoubleAnimationUsingKeyFrames animation = new()
        {
            Duration = TimeSpan.FromMilliseconds(950),
        };
        animation.KeyFrames.Add(new DiscreteDoubleKeyFrame(0, KeyTime.FromPercent(0)));
        animation.KeyFrames.Add(new EasingDoubleKeyFrame(1, KeyTime.FromPercent(0.12)));
        animation.KeyFrames.Add(new EasingDoubleKeyFrame(0.18, KeyTime.FromPercent(0.42)));
        animation.KeyFrames.Add(new EasingDoubleKeyFrame(0.72, KeyTime.FromPercent(0.58)));
        animation.KeyFrames.Add(new EasingDoubleKeyFrame(0, KeyTime.FromPercent(1)));
        animation.Completed += (_, _) => layer.Remove(this);

        BeginAnimation(OpacityProperty, animation, HandoffBehavior.SnapshotAndReplace);
    }

    protected override void OnRender(DrawingContext drawingContext)
    {
        Rect bounds = new(
            new Point(-2, -2),
            new Size(Math.Max(0, ActualWidth + 4), Math.Max(0, ActualHeight + 4)));
        drawingContext.DrawRoundedRectangle(_fill, _outline, bounds, 6, 6);
    }
}
