using System.Windows;

namespace Draft.Dialogs.Base.Services;

public static class DialogWindowService
{
    public static bool? ShowDialog(Window window, Window? preferredOwner = null)
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

        return window.ShowDialog();
    }
}
