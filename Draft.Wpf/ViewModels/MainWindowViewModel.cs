using Draft.Helpers;
using System.Windows;

namespace Draft.ViewModels;

public enum WorkspaceState
{
    Editor,
    Split,
    Preview
}

public class MainWindowViewModel : BaseViewModel
{
    private WorkspaceState _workspaceState;

    public WorkspaceState WorkspaceState
    {
        get => _workspaceState;
        set
        {
            if (_workspaceState == value)
                return;

            _workspaceState = value;
            OnPropertyChanged();
            OnPropertyChanged(nameof(IsEditorState));
            OnPropertyChanged(nameof(IsSplitState));
            OnPropertyChanged(nameof(IsPreviewState));
            OnPropertyChanged(nameof(EditorColumnWidth));
            OnPropertyChanged(nameof(PreviewColumnWidth));
            OnPropertyChanged(nameof(DividerColumnWidth));
            OnPropertyChanged(nameof(DividerWidth));
        }
    }

    public bool IsEditorState
    {
        get => WorkspaceState == WorkspaceState.Editor;
        set
        {
            if (value)
                WorkspaceState = WorkspaceState.Editor;
        }
    }

    public bool IsSplitState
    {
        get => WorkspaceState == WorkspaceState.Split;
        set
        {
            if (value)
                WorkspaceState = WorkspaceState.Split;
        }
    }

    public bool IsPreviewState
    {
        get => WorkspaceState == WorkspaceState.Preview;
        set
        {
            if (value)
                WorkspaceState = WorkspaceState.Preview;
        }
    }

    public GridLength EditorColumnWidth => WorkspaceState == WorkspaceState.Preview ? new GridLength(0) : new GridLength(1, GridUnitType.Star);

    public GridLength PreviewColumnWidth => WorkspaceState == WorkspaceState.Editor ? new GridLength(0) : new GridLength(1, GridUnitType.Star);

    public GridLength DividerColumnWidth => WorkspaceState == WorkspaceState.Split ? GridLength.Auto : new GridLength(0);

    public double DividerWidth => WorkspaceState == WorkspaceState.Split ? 1 : 0;

    public MainWindowViewModel()
    {
        WorkspaceState = WorkspaceState.Split;
    }
}
