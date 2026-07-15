using Draft.Dialogs.Base.Services;
using Draft.Dialogs.Base.Views;
using Draft.Dialogs.Progress.Models;
using Draft.Dialogs.Progress.ViewModels;
using Draft.Dialogs.Progress.Views;
using System.Windows;
using System.Windows.Threading;

namespace Draft.Dialogs.Progress.Services;

public sealed class ProgressDialogService : IProgressDialogService
{
    public IDisposable ShowDelayed(ProgressDialogRequest request, Window? owner = null)
    {
        ArgumentNullException.ThrowIfNull(request);

        return new DelayedProgressDialogHandle(request, owner);
    }

    private sealed class DelayedProgressDialogHandle : IDisposable
    {
        private readonly ProgressDialogRequest _request;
        private readonly Window? _owner;
        private readonly DispatcherTimer _showTimer;
        private BaseDialogWindow? _window;
        private ProgressDialogViewModel? _viewModel;
        private bool _isDisposed;

        public DelayedProgressDialogHandle(ProgressDialogRequest request, Window? owner)
        {
            _request = request;
            _owner = owner;
            _showTimer = new DispatcherTimer
            {
                Interval = request.Delay,
            };
            _showTimer.Tick += ShowTimer_Tick;
            _showTimer.Start();
        }

        public void Dispose()
        {
            if (_isDisposed)
                return;

            _isDisposed = true;
            _showTimer.Stop();
            _showTimer.Tick -= ShowTimer_Tick;
            CloseWindow();
        }

        private void ShowTimer_Tick(object? sender, EventArgs e)
        {
            _showTimer.Stop();
            _showTimer.Tick -= ShowTimer_Tick;

            if (_isDisposed)
                return;

            _viewModel = new ProgressDialogViewModel(_request);

            ProgressDialogView view = new()
            {
                DataContext = _viewModel,
            };

            _window = new BaseDialogWindow(view)
            {
                Title = _request.Title,
                Focusable = true,
            };
            _window.Closed += Window_Closed;

            DialogWindowService.Show(_window, _owner);
        }

        private void Window_Closed(object? sender, EventArgs e)
        {
            if (_window is not null)
            {
                _window.Closed -= Window_Closed;
                _window = null;
            }

            if (_viewModel is not null)
            {
                _viewModel = null;
            }
        }

        private void CloseWindow()
        {
            BaseDialogWindow? window = _window;
            if (window is null)
                return;

            if (window.Dispatcher.CheckAccess())
            {
                window.Close();
                return;
            }

            window.Dispatcher.BeginInvoke(window.Close);
        }
    }
}
