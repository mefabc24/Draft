using System.Windows.Threading;

namespace Draft.Save.Services;

public sealed class AutosaveScheduler
{
    private readonly DispatcherTimer _timer = new();

    public event EventHandler? Tick
    {
        add => _timer.Tick += value;
        remove => _timer.Tick -= value;
    }

    public void Schedule(TimeSpan interval)
    {
        _timer.Stop();
        _timer.Interval = interval;
        _timer.Start();
    }

    public void Stop()
    {
        _timer.Stop();
    }
}
