using Draft.Settings.Models;

namespace Draft.Settings.Services;

public sealed class SettingsApplicationService
{
    public bool SaveAndApply(DraftSettings settings)
    {
        bool saved = AppSettingsStore.TrySave(settings);
        FileAssociationService.TryApplyTextAssociations(settings.AssociateTxtFilesWithDraft);

        return saved;
    }
}
