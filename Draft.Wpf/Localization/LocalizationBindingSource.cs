using System.ComponentModel;

namespace Draft.Localization;

public sealed class LocalizationBindingSource : INotifyPropertyChanged
{
    private int _version;

    public static LocalizationBindingSource Current { get; } = new();

    public int Version
    {
        get => _version;
        private set
        {
            if (_version == value)
                return;

            _version = value;
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Version)));
        }
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    internal void Refresh()
    {
        unchecked
        {
            Version++;
        }
    }
}
