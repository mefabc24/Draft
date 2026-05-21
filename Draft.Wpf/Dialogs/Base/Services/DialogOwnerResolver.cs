using System.Windows;

namespace Draft.Dialogs.Base.Services;

public static class DialogOwnerResolver
{
    public static Window? Resolve(Window? preferredOwner = null)
    {
        if (preferredOwner is not null)
            return preferredOwner;

        if (Application.Current?.Windows is null)
            return null;

        return Application.Current.Windows
            .OfType<Window>()
            .FirstOrDefault(window => window.IsActive && window.IsVisible)
            ?? Application.Current.MainWindow;
    }
}
