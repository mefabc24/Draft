using Draft.Dialogs.Message.Models;
using Draft.Dialogs.Message.Services;
using Draft.Dialogs.Progress.Models;
using Draft.Dialogs.Progress.Services;
using Draft.Dialogs.Prompts.Autosave.Models;
using Draft.Dialogs.Prompts.Autosave.Services;
using Draft.Dialogs.Prompts.Export.Models;
using Draft.Dialogs.Prompts.Export.Services;
using Draft.Dialogs.Prompts.GoToPosition.Models;
using Draft.Dialogs.Prompts.GoToPosition.Services;
using Draft.Dialogs.Prompts.RevertSave.Models;
using Draft.Dialogs.Prompts.RevertSave.Services;
using Draft.Settings.Models;
using Draft.Settings.ViewModels;
using Draft.Settings.Views;
using Draft.Shell.ViewModels;
using System.Windows;

namespace Draft.Shell.Services;

public sealed class ShellDialogCoordinator
{
    private readonly IAutosavePromptService _autosavePromptService;
    private readonly IExportPromptService _exportPromptService;
    private readonly IGoToPositionPromptService _goToPositionPromptService;
    private readonly IMessageDialogService _messageDialogService;
    private readonly IProgressDialogService _progressDialogService;
    private readonly IRevertSavePromptService _revertSavePromptService;

    public ShellDialogCoordinator()
        : this(
            new MessageDialogService(),
            new ProgressDialogService(),
            new GoToPositionPromptService(),
            new AutosavePromptService(),
            new ExportPromptService(),
            new RevertSavePromptService())
    {
    }

    public ShellDialogCoordinator(
        IMessageDialogService messageDialogService,
        IProgressDialogService progressDialogService,
        IGoToPositionPromptService goToPositionPromptService,
        IAutosavePromptService autosavePromptService,
        IExportPromptService exportPromptService,
        IRevertSavePromptService revertSavePromptService)
    {
        _messageDialogService = messageDialogService;
        _progressDialogService = progressDialogService;
        _goToPositionPromptService = goToPositionPromptService;
        _autosavePromptService = autosavePromptService;
        _exportPromptService = exportPromptService;
        _revertSavePromptService = revertSavePromptService;
    }

    public SettingsWindow CreateSettingsWindow(
        Window owner,
        SettingsPage initialPage,
        EventHandler<SettingsAppliedEventArgs> settingsApplied)
    {
        SettingsWindow settingsWindow = new(initialPage)
        {
            Owner = owner,
            WindowStartupLocation = WindowStartupLocation.CenterOwner,
        };
        settingsWindow.SettingsApplied += settingsApplied;

        return settingsWindow;
    }

    public GoToPositionPromptResult ShowGoToPositionPrompt(
        Window owner,
        int cursorLine,
        int cursorColumn)
    {
        return _goToPositionPromptService.Show(
            new GoToPositionPromptRequest(cursorLine, cursorColumn),
            owner);
    }

    public AutosavePromptResult ShowAutosavePrompt(
        Window owner,
        DraftSettings settings)
    {
        return _autosavePromptService.Show(
            new AutosavePromptRequest(settings.AutosaveEnabled, settings.AutosaveInterval),
            owner);
    }

    public ExportPromptResult ShowExportPrompt(Window owner, string defaultPreviewTheme)
    {
        return _exportPromptService.Show(new ExportPromptRequest(defaultPreviewTheme: defaultPreviewTheme), owner);
    }

    public IDisposable ShowDelayedProgress(
        Window owner,
        string title,
        string description,
        TimeSpan delay)
    {
        return _progressDialogService.ShowDelayed(
            new ProgressDialogRequest(title, description, delay),
            owner);
    }

    public RevertSavePromptResult ShowRevertSavePrompt(
        Window owner,
        string? currentFilePath)
    {
        return _revertSavePromptService.Show(
            new RevertSavePromptRequest(currentFilePath),
            owner);
    }

    public bool ConfirmDiscardUnsavedChanges(MainWindowViewModel? viewModel)
    {
        if (viewModel?.ConfirmBeforeClosingUnsavedFiles == false)
            return true;

        if (viewModel?.IsDirty != true)
            return true;

        MessageDialogResult result = ShowConfirmationDialog(
            LocalizationService.Translate("dialog.unsavedChanges.title", "Unsaved Changes"),
            LocalizationService.Translate(
                "dialog.unsavedChanges.continueDescription",
                "You have unsaved changes. Do you want to continue?"),
            LocalizationService.Translate("common.continue", "Continue"),
            "continue");

        return result.Id == "continue";
    }

    public bool ConfirmCloseWithUnsavedChanges(MainWindowViewModel? viewModel)
    {
        if (viewModel?.ConfirmBeforeClosingUnsavedFiles == false)
            return true;

        if (viewModel?.HasUnsavedWork != true)
            return true;

        MessageDialogResult result = ShowConfirmationDialog(
            LocalizationService.Translate("dialog.unsavedChanges.title", "Unsaved Changes"),
            LocalizationService.Translate(
                "dialog.unsavedChanges.closeDescription",
                "This file has unsaved changes or has not been saved yet. If you close now, all unsaved work will be lost. Do you really want to close Draft?"),
            LocalizationService.Translate("dialog.unsavedChanges.closeDraft", "Close Draft"),
            "close-draft");

        return result.Id == "close-draft";
    }

    public bool ConfirmOpenExternalLink(Uri uri)
    {
        MessageDialogResult result = ShowConfirmationDialog(
            LocalizationService.Translate("dialog.openExternalLink.title", "Open External Link"),
            LocalizationService.TranslateFormat(
                "dialog.openExternalLink.description",
                "Open this link in your default browser?\n{url}",
                new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["url"] = uri.AbsoluteUri,
                }),
            LocalizationService.Translate("dialog.openExternalLink.openLink", "Open Link"),
            "open-link");

        return result.Id == "open-link";
    }

    public MissingFilePathSaveAction ShowMissingFilePathSavePrompt(string filePath)
    {
        MessageDialogResult result = _messageDialogService.ShowMessage(
            new MessageDialogRequest(
                LocalizationService.Translate("dialog.missingFileSave.title", "File Location Missing"),
                LocalizationService.TranslateFormat(
                    "dialog.missingFileSave.description",
                    "The original file was moved, renamed, or deleted outside Draft.\n\nDraft will not recreate it automatically. Choose how to save the current document.\n\nOriginal path:\n{path}",
                    new Dictionary<string, string>(StringComparer.Ordinal)
                    {
                        ["path"] = filePath,
                    }),
                MessageDialogType.Warning,
                new[]
                {
                    MessageDialogButtonDefinition.Secondary(
                        LocalizationService.Translate("common.cancel", "Cancel"),
                        MessageDialogResult.Cancel),
                    MessageDialogButtonDefinition.Secondary(
                        LocalizationService.Translate("dialog.missingFileSave.recreate", "Recreate"),
                        new MessageDialogResult("recreate")),
                    MessageDialogButtonDefinition.Secondary(
                        LocalizationService.Translate("dialog.missingFileSave.selectFile", "Select File"),
                        new MessageDialogResult("select-file")),
                    MessageDialogButtonDefinition.Primary(
                        LocalizationService.Translate("dialog.missingFileSave.saveAs", "Save As"),
                        new MessageDialogResult("save-as")),
                },
                width: 620,
                textMaxWidth: 540));

        return result.Id switch
        {
            "save-as" => MissingFilePathSaveAction.SaveAs,
            "select-file" => MissingFilePathSaveAction.SelectFile,
            "recreate" => MissingFilePathSaveAction.Recreate,
            _ => MissingFilePathSaveAction.Cancel,
        };
    }

    public void ShowFileOperationError(string title, Exception ex)
    {
        ShowMessage(
            title,
            ex.Message,
            MessageDialogType.Error);
    }

    public void ShowMessage(string title, string description, MessageDialogType dialogType)
    {
        _messageDialogService.ShowMessage(
            new MessageDialogRequest(
                title,
                description,
                dialogType,
                new[]
                {
                    MessageDialogButtonDefinition.Primary(
                        LocalizationService.Translate("common.okay", "Okay"),
                        MessageDialogResult.Ok),
                }));
    }

    private MessageDialogResult ShowConfirmationDialog(
        string title,
        string description,
        string primaryButtonText,
        string primaryResultId)
    {
        return _messageDialogService.ShowMessage(
            new MessageDialogRequest(
                title,
                description,
                MessageDialogType.Warning,
                new[]
                {
                    MessageDialogButtonDefinition.Secondary(
                        LocalizationService.Translate("common.cancel", "Cancel"),
                        MessageDialogResult.Cancel),
                    MessageDialogButtonDefinition.Primary(primaryButtonText, new MessageDialogResult(primaryResultId)),
                }));
    }
}
