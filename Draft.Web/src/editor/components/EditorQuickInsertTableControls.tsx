import { useState, type MouseEvent as ReactMouseEvent } from 'react'
import type { CreateTableMarkdownData } from '../commands/createTableMarkdown'
import { useTranslation } from '../../localization/useTranslation'
import NumberSpinner from './NumberSpinner'

type EditorQuickInsertTableControlsProps = {
  onConfirm: (tableData: CreateTableMarkdownData, keepOpen?: boolean) => void
}

const DEFAULT_ROWS = 3
const DEFAULT_COLUMNS = 3
const MIN_ROWS = 1
const MIN_COLUMNS = 1

function createTableData(
  rows: number,
  columns: number,
  populateWithSampleText: boolean,
): CreateTableMarkdownData {
  return {
    headers: Array.from({ length: columns }, (_, index) =>
      populateWithSampleText ? `title${index + 1}` : '',
    ),
    rows: Array.from({ length: rows }, () =>
      Array.from({ length: columns }, () =>
        populateWithSampleText ? 'cell' : '',
      ),
    ),
  }
}

function EditorQuickInsertTableControls({
  onConfirm,
}: EditorQuickInsertTableControlsProps) {
  const { t } = useTranslation()
  const [rows, setRows] = useState(DEFAULT_ROWS)
  const [columns, setColumns] = useState(DEFAULT_COLUMNS)
  const [populateWithSampleText, setPopulateWithSampleText] = useState(false)

  return (
    <div className="editor-quick-insert-table-controls">
      <div className="editor-quick-insert-table-fields">
        <div className="editor-quick-insert-table-field">
          <span className="editor-quick-insert-table-label">
            {t('quickInsert.table.columns')}
          </span>
          <NumberSpinner
            label={t('quickInsert.table.columns')}
            min={MIN_COLUMNS}
            value={columns}
            onChange={setColumns}
          />
        </div>
        <div className="editor-quick-insert-table-field">
          <span className="editor-quick-insert-table-label">
            {t('quickInsert.table.rows')}
          </span>
          <NumberSpinner
            label={t('quickInsert.table.rows')}
            min={MIN_ROWS}
            value={rows}
            onChange={setRows}
          />
        </div>
      </div>
      <label
        className="editor-quick-insert-table-sample"
        onMouseDown={(event) => {
          event.stopPropagation()
        }}
      >
        <input
          type="checkbox"
          className="editor-quick-insert-table-sample-input"
          checked={populateWithSampleText}
          onChange={(event) => {
            setPopulateWithSampleText(event.target.checked)
          }}
        />
        <span
          className="editor-quick-insert-table-sample-box"
          aria-hidden="true"
        >
          <svg focusable="false" viewBox="0 0 16 16">
            <path d="m3.5 8.2 2.8 2.8 6.2-6.4" />
          </svg>
        </span>
        <span className="editor-quick-insert-table-sample-text">
          {t('quickInsert.table.populateWithSampleText')}
        </span>
      </label>
      <button
        type="button"
        className="editor-quick-insert-table-confirm"
        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
          onConfirm(
            createTableData(rows, columns, populateWithSampleText),
            event.shiftKey && event.button === 0,
          )
        }}
      >
        {t('common.create')}
      </button>
    </div>
  )
}

export default EditorQuickInsertTableControls
