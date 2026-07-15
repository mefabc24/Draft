using System.Runtime.InteropServices;
using System.Windows;

namespace Draft.WebWorkspace.Services;

public sealed class ClipboardTextService
{
    private const int ClipboardRetryCount = 3;
    private static readonly TimeSpan ClipboardRetryDelay = TimeSpan.FromMilliseconds(20);

    public void SetPlainText(string text)
    {
        if (string.IsNullOrEmpty(text))
            return;

        for (int attempt = 0; attempt < ClipboardRetryCount; attempt++)
        {
            try
            {
                Clipboard.SetDataObject(CreateTextDataObject(text), true);
                return;
            }
            catch (ExternalException) when (attempt + 1 < ClipboardRetryCount)
            {
                Thread.Sleep(ClipboardRetryDelay);
            }
            catch (ExternalException)
            {
                return;
            }
        }
    }

    private static DataObject CreateTextDataObject(string text)
    {
        DataObject dataObject = new();

        TryCopyExistingClipboardFormats(dataObject);
        dataObject.SetText(text, TextDataFormat.UnicodeText);
        dataObject.SetText(text, TextDataFormat.Text);

        return dataObject;
    }

    private static void TryCopyExistingClipboardFormats(DataObject dataObject)
    {
        try
        {
            IDataObject? existingDataObject = Clipboard.GetDataObject();

            if (existingDataObject is null)
                return;

            foreach (string format in existingDataObject.GetFormats(autoConvert: false))
            {
                if (IsTextFormat(format))
                    continue;

                TryCopyExistingClipboardFormat(existingDataObject, dataObject, format);
            }
        }
        catch (ExternalException)
        {
        }
    }

    private static void TryCopyExistingClipboardFormat(
        IDataObject sourceDataObject,
        DataObject targetDataObject,
        string format)
    {
        try
        {
            object? data = sourceDataObject.GetData(format, autoConvert: false);

            if (data is not null)
            {
                targetDataObject.SetData(format, data, autoConvert: false);
            }
        }
        catch (ExternalException)
        {
        }
    }

    private static bool IsTextFormat(string format)
        => format == DataFormats.Text
            || format == DataFormats.UnicodeText
            || format == DataFormats.StringFormat
            || format == DataFormats.OemText;
}
