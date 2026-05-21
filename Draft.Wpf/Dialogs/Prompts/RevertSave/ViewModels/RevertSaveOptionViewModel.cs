using Draft.Dialogs.Prompts.RevertSave.Models;

namespace Draft.Dialogs.Prompts.RevertSave.ViewModels;

public sealed class RevertSaveOptionViewModel : BaseViewModel
{
    private readonly Action<RevertSaveOptionViewModel> _selected;
    private bool _isSelected;

    public RevertSaveOptionViewModel(
        RevertSaveOptionKind optionKind,
        string title,
        string wordCountText,
        string timestampText,
        bool isLatest,
        bool isAvailable,
        string unavailableText,
        Action<RevertSaveOptionViewModel> selected)
    {
        OptionKind = optionKind;
        Title = title;
        WordCountText = wordCountText;
        TimestampText = timestampText;
        IsLatest = isLatest;
        IsAvailable = isAvailable;
        UnavailableText = unavailableText;
        _selected = selected;
    }

    public RevertSaveOptionKind OptionKind { get; }

    public string Title { get; }

    public string WordCountText { get; }

    public string TimestampText { get; }

    public bool IsLatest { get; }

    public bool IsAvailable { get; }

    public string UnavailableText { get; }

    public bool IsSelected
    {
        get => _isSelected;
        set
        {
            if (!SetProperty(ref _isSelected, value) || !value)
                return;

            _selected(this);
        }
    }
}
