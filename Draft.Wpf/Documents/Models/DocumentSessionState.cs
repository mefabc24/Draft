using Draft.Save.Models;

namespace Draft.Documents.Models;

public sealed class DocumentSessionState
{
    public string CurrentContent { get; private set; } = string.Empty;

    public string? CurrentFilePath { get; private set; }

    public DateTimeOffset CurrentDraftUpdatedAtUtc { get; private set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? LastSavedAtUtc { get; private set; }

    public DocumentSaveKind LastSaveKind { get; private set; } = DocumentSaveKind.Manual;

    public bool HasFilePath => !string.IsNullOrWhiteSpace(CurrentFilePath);

    public bool IsDirty => CurrentContent != LastSavedContent;

    public bool HasUnsavedWork => IsDirty
        || (!HasFilePath && !string.IsNullOrEmpty(CurrentContent));

    public bool SaveStatusDotVisible => HasFilePath
        || IsDirty
        || !string.IsNullOrEmpty(CurrentContent);

    private string LastSavedContent { get; set; } = string.Empty;

    public void Load(DocumentState document)
    {
        CurrentFilePath = document.FullPath;
        CurrentContent = document.Content;
        CurrentDraftUpdatedAtUtc = document.LastWriteTimeUtc;
        LastSavedAtUtc = document.LastWriteTimeUtc;
        LastSaveKind = DocumentSaveKind.Manual;
        LastSavedContent = document.Content;
    }

    public void MarkSaved(
        string fullPath,
        string savedContent,
        DateTimeOffset savedAtUtc,
        DocumentSaveKind saveKind)
    {
        CurrentFilePath = fullPath;
        CurrentContent = savedContent;
        CurrentDraftUpdatedAtUtc = savedAtUtc;
        LastSavedAtUtc = savedAtUtc;
        LastSaveKind = saveKind;
        LastSavedContent = savedContent;
    }

    public void UpdateContent(string content, DateTimeOffset updatedAtUtc)
    {
        CurrentContent = content;
        CurrentDraftUpdatedAtUtc = updatedAtUtc;
    }

    public void CreateNew(DateTimeOffset updatedAtUtc)
    {
        CurrentFilePath = null;
        CurrentContent = string.Empty;
        CurrentDraftUpdatedAtUtc = updatedAtUtc;
        LastSavedAtUtc = null;
        LastSaveKind = DocumentSaveKind.Manual;
        LastSavedContent = string.Empty;
    }
}
