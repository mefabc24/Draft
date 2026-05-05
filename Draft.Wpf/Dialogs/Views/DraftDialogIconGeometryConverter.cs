using Draft.Dialogs.Models;
using System.Globalization;
using System.Windows;
using System.Windows.Data;
using System.Windows.Media;

namespace Draft.Dialogs.Views;

public sealed class DraftDialogIconGeometryConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        string key = value switch
        {
            DraftDialogType.Error => "DraftDialog.Icon.Error",
            DraftDialogType.Success => "DraftDialog.Icon.Success",
            DraftDialogType.Warning => "DraftDialog.Icon.Warning",
            _ => "DraftDialog.Icon.Info",
        };

        return Application.Current.TryFindResource(key) as Geometry
            ?? Geometry.Empty;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotSupportedException();
    }
}
