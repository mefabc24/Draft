using Draft.Dialogs.Message.Models;
using Draft.Dialogs.Message.Services;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Security;

namespace Draft.ExternalLinks.Services;

public sealed class ExternalLinkService
{
    private readonly IMessageDialogService _messageDialogService;

    public ExternalLinkService()
        : this(new MessageDialogService())
    {
    }

    public ExternalLinkService(IMessageDialogService messageDialogService)
    {
        _messageDialogService = messageDialogService;
    }

    public bool TryOpen(string url, bool confirmBeforeOpening)
    {
        if (!TryCreateExternalUri(url, out Uri? uri))
            return false;

        if (confirmBeforeOpening && !ConfirmOpenExternalLink(uri))
            return false;

        try
        {
            Process.Start(new ProcessStartInfo(uri.AbsoluteUri)
            {
                UseShellExecute = true,
            });

            return true;
        }
        catch (Exception ex) when (IsExternalLinkException(ex))
        {
            ShowOpenFailedDialog();
            return false;
        }
    }

    private bool ConfirmOpenExternalLink(Uri uri)
    {
        MessageDialogResult result = _messageDialogService.ShowMessage(
            new MessageDialogRequest(
                LocalizationService.Translate("dialog.openExternalLink.title", "Open External Link"),
                LocalizationService.TranslateFormat(
                    "dialog.openExternalLink.description",
                    "Open this link in your default browser?\n{url}",
                    new Dictionary<string, string>(StringComparer.Ordinal)
                    {
                        ["url"] = uri.AbsoluteUri,
                    }),
                MessageDialogType.Warning,
                new[]
                {
                    MessageDialogButtonDefinition.Secondary(
                        LocalizationService.Translate("common.cancel", "Cancel"),
                        MessageDialogResult.Cancel),
                    MessageDialogButtonDefinition.Primary(
                        LocalizationService.Translate("dialog.openExternalLink.openLink", "Open Link"),
                        new MessageDialogResult("open-link")),
                }));

        return result.Id == "open-link";
    }

    private void ShowOpenFailedDialog()
    {
        _messageDialogService.ShowMessage(
            new MessageDialogRequest(
                LocalizationService.Translate("dialog.openExternalLink.title", "Open External Link"),
                LocalizationService.Translate(
                    "dialog.openExternalLink.openFailed",
                    "The link could not be opened in your default browser."),
                MessageDialogType.Error,
                new[]
                {
                    MessageDialogButtonDefinition.Primary(
                        LocalizationService.Translate("common.okay", "Okay"),
                        MessageDialogResult.Ok),
                }));
    }

    private static bool TryCreateExternalUri(string url, out Uri uri)
    {
        uri = null!;

        if (string.IsNullOrWhiteSpace(url)
            || !Uri.TryCreate(url, UriKind.Absolute, out Uri? parsedUri))
        {
            return false;
        }

        if (!string.Equals(parsedUri.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
            && !string.Equals(parsedUri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
            && !string.Equals(parsedUri.Scheme, Uri.UriSchemeMailto, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        uri = parsedUri;
        return true;
    }

    private static bool IsExternalLinkException(Exception ex)
    {
        return ex is Win32Exception
            or InvalidOperationException
            or FileNotFoundException
            or SecurityException;
    }
}
