using System.Windows;

namespace Draft.Dialogs.Base.Services;

public static class DialogWindowService
{
    public static void Show(Window window, Window? preferredOwner = null)
    {
        ApplyOwner(window, preferredOwner);
        window.Show();
    }

    public static bool? ShowDialog(Window window, Window? preferredOwner = null)
    {
        ApplyOwner(window, preferredOwner);
        return window.ShowDialog();
    }

    private static void ApplyOwner(Window window, Window? preferredOwner)
    {
        Window? owner = DialogOwnerResolver.Resolve(preferredOwner);
        if (owner is not null)
        {
            window.Owner = owner;
        }
        else
        {
            window.WindowStartupLocation = WindowStartupLocation.CenterScreen;
        }
    }
}
