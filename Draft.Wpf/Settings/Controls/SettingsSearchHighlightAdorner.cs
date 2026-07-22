using System.Windows;
using System.Windows.Documents;
using System.Windows.Media;
using System.Windows.Media.Animation;

namespace Draft.Settings.Controls;

internal sealed class SettingsSearchHighlightAdorner : Adorner
{
    private readonly Brush _fill;

    public SettingsSearchHighlightAdorner(UIElement adornedElement, Brush accentBrush)
        : base(adornedElement)
    {
        IsHitTestVisible = false;
        Opacity = 0;

        _fill = accentBrush.Clone();
        _fill.Opacity = 0.14;
        _fill.Freeze();
    }

    public void Begin(AdornerLayer layer)
    {
        DoubleAnimationUsingKeyFrames animation = new()
        {
            Duration = TimeSpan.FromMilliseconds(700),
        };
        animation.KeyFrames.Add(new DiscreteDoubleKeyFrame(0, KeyTime.FromPercent(0)));
        animation.KeyFrames.Add(new EasingDoubleKeyFrame(1, KeyTime.FromPercent(0.18)));
        animation.KeyFrames.Add(new EasingDoubleKeyFrame(0, KeyTime.FromPercent(1)));
        animation.Completed += (_, _) => layer.Remove(this);

        BeginAnimation(OpacityProperty, animation, HandoffBehavior.SnapshotAndReplace);
    }

    protected override void OnRender(DrawingContext drawingContext)
    {
        Rect bounds = new(
            new Point(-2, -2),
            new Size(Math.Max(0, ActualWidth + 4), Math.Max(0, ActualHeight + 4)));
        drawingContext.DrawRoundedRectangle(_fill, null, bounds, 6, 6);
    }
}
