using Draft.Dialogs.Message.Models;
using System.Globalization;
using System.Windows;
using System.Windows.Data;

namespace Draft.Dialogs.Message.Views;

public sealed class MessageDialogButtonStyleConverter : IValueConverter
{
    public Style? PrimaryStyle { get; set; }

    public Style? SecondaryStyle { get; set; }

    public object? Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        return value is MessageDialogActionType.Primary
            ? PrimaryStyle
            : SecondaryStyle;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotSupportedException();
    }
}
