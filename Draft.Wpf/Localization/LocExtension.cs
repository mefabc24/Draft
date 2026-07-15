using System.Globalization;
using System.Windows.Data;
using System.Windows.Markup;

namespace Draft.Localization;

[MarkupExtensionReturnType(typeof(string))]
public sealed class LocExtension : MarkupExtension
{
    public LocExtension()
    {
    }

    public LocExtension(string key)
    {
        Key = key;
    }

    public string Key { get; set; } = string.Empty;

    public string? Fallback { get; set; }

    public override object ProvideValue(IServiceProvider serviceProvider)
    {
        Binding binding = new(nameof(LocalizationBindingSource.Version))
        {
            Source = LocalizationBindingSource.Current,
            Mode = BindingMode.OneWay,
            Converter = new LocalizationValueConverter(Key, Fallback),
        };

        return binding.ProvideValue(serviceProvider);
    }

    private sealed class LocalizationValueConverter : IValueConverter
    {
        private readonly string? _fallback;
        private readonly string _key;

        public LocalizationValueConverter(string key, string? fallback)
        {
            _key = key;
            _fallback = fallback;
        }

        public object Convert(
            object value,
            Type targetType,
            object parameter,
            CultureInfo culture)
        {
            return LocalizationService.Translate(_key, _fallback);
        }

        public object ConvertBack(
            object value,
            Type targetType,
            object parameter,
            CultureInfo culture)
        {
            throw new NotSupportedException();
        }
    }
}
