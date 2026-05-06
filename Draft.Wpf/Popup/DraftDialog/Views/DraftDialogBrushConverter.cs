using Draft.Dialogs.Models;
using System.Globalization;
using System.Windows;
using System.Windows.Data;
using System.Windows.Media;

namespace Draft.Dialogs.Views;

public sealed class DraftDialogBrushConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        string key = value switch
        {
            DraftDialogType.Error => "Brush.Function.Critical",
            DraftDialogType.Success => "Brush.Function.Success",
            DraftDialogType.Warning => "Brush.Function.Warning",
            _ => "Brush.Function.Info",
        };

        return Application.Current.TryFindResource(key) as Brush
            ?? Brushes.White;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotSupportedException();
    }
}
