using Draft.Settings.Models;
using System.Windows;

namespace Draft.Shell.Services;

public sealed class WindowSizingService
{
    private const double StartupWindowHeightScale = 0.8;
    private const double StartupWindowAspectRatio = 16.0 / 9.0;
    private const double BaseMinWindowWidth = 1000;
    private const double BaseMinWindowHeight = 500;

    public void ApplyStartupWindowSize(Window window)
    {
        window.WindowStartupLocation = WindowStartupLocation.CenterScreen;

        double height = SystemParameters.WorkArea.Height * StartupWindowHeightScale;
        window.Height = height;
        window.Width = height * StartupWindowAspectRatio;
    }

    public void ApplyMinimumWindowSize(Window window, DraftSettings settings)
    {
        window.MinWidth = BaseMinWindowWidth * settings.WindowMinimumSizeScale;
        window.MinHeight = BaseMinWindowHeight * settings.WindowMinimumSizeScale;

        if (window.Width < window.MinWidth)
        {
            window.Width = window.MinWidth;
        }

        if (window.Height < window.MinHeight)
        {
            window.Height = window.MinHeight;
        }
    }

    public bool ShouldUseSquareCorners(WindowState windowState, bool isWindowSnapped)
    {
        return windowState == WindowState.Maximized || isWindowSnapped;
    }

    public CornerRadius GetFrameCornerRadius(WindowState windowState, bool isWindowSnapped)
    {
        return ShouldUseSquareCorners(windowState, isWindowSnapped)
            ? new CornerRadius(0)
            : new CornerRadius(8);
    }

    public CornerRadius GetStatusBarCornerRadius(WindowState windowState, bool isWindowSnapped)
    {
        return ShouldUseSquareCorners(windowState, isWindowSnapped)
            ? new CornerRadius(0)
            : new CornerRadius(0, 0, 8, 8);
    }
}
