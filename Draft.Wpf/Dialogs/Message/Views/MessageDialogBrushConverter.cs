using Draft.Dialogs.Message.Models;
using System.Globalization;
using System.Windows;
using System.Windows.Data;

namespace Draft.Dialogs.Message.Views;

public sealed class MessageDialogBrushConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        string resourceKey = value switch
        {
            MessageDialogType.Error => "Brush.Function.Critical",
            MessageDialogType.Success => "Brush.Function.Success",
            MessageDialogType.Warning => "Brush.Function.Warning",
            _ => "Brush.Function.Info",
        };

        return Application.Current.FindResource(resourceKey);
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotSupportedException();
    }
}
