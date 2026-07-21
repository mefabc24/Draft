import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../localization/useTranslation'
import {
  workspaceFindReplaceOptions,
  type WorkspaceFindReplaceOptionDefinition,
} from '../findReplaceOptions'
import '../styles/workspaceFindReplaceMenu.css'

type WorkspaceFindReplaceMenuProps = {
  isOpen: boolean
  onClose: () => void
  options?: readonly WorkspaceFindReplaceOptionDefinition[]
}

const findReplaceIconPaths = {
  replace: 'icons/Replace.svg',
  search: 'icons/Search.svg',
} as const

function getFindReplaceIconSrc(name: keyof typeof findReplaceIconPaths) {
  return `${import.meta.env.BASE_URL}${findReplaceIconPaths[name]}`
}

function FindReplaceAssetIcon({
  name,
}: {
  name: keyof typeof findReplaceIconPaths
}) {
  return (
    <img
      aria-hidden="true"
      className="workspace-find-replace-asset-icon"
      src={getFindReplaceIconSrc(name)}
      alt=""
    />
  )
}

function FindReplaceNavigationIcon({ direction }: { direction: 'down' | 'up' }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16">
      <path
        d={
          direction === 'up'
            ? 'M3.75 9.75 8 5.5l4.25 4.25'
            : 'M3.75 6.25 8 10.5l4.25-4.25'
        }
      />
    </svg>
  )
}

function FindReplaceCloseIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="24 19 12 12">
      <path d="M34.647 19.6464C34.8423 19.4512 35.1588 19.4512 35.3541 19.6464C35.5492 19.8417 35.5492 20.1582 35.3541 20.3534L30.7076 24.9999L35.3541 29.6464C35.5492 29.8417 35.5492 30.1582 35.3541 30.3534C35.1588 30.5487 34.8423 30.5486 34.647 30.3534L29.9996 25.707L25.3541 30.3534C25.1588 30.5484 24.8412 30.5486 24.6461 30.3534C24.4513 30.1583 24.4513 29.8416 24.6461 29.6464L29.2925 24.9999L24.6461 20.3534C24.4513 20.1583 24.4513 19.8416 24.6461 19.6464C24.8412 19.4512 25.1588 19.4515 25.3541 19.6464L29.9996 24.2919L34.647 19.6464Z" />
    </svg>
  )
}

function WorkspaceFindReplaceMenu({
  isOpen,
  onClose,
  options = workspaceFindReplaceOptions,
}: WorkspaceFindReplaceMenuProps) {
  const { t } = useTranslation()
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [allEnabled, setAllEnabled] = useState(true)
  const [optionOverrides, setOptionOverrides] = useState<Record<string, boolean>>(
    {},
  )

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [isOpen])

  return (
    <section
      aria-hidden={!isOpen}
      aria-label={t('findReplace.dialogLabel')}
      className={`workspace-find-replace-menu${isOpen ? ' is-open' : ''}`}
      inert={isOpen ? undefined : true}
      role="dialog"
    >
      <div className="workspace-find-replace-field workspace-find-replace-search-field">
        <FindReplaceAssetIcon name="search" />
        <input
          ref={searchInputRef}
          aria-label={t('findReplace.searchInputLabel')}
          autoComplete="off"
          placeholder={t('findReplace.searchPlaceholder')}
          spellCheck={false}
          type="text"
        />
        <span className="workspace-find-replace-result-count">1/2</span>
        <div className="workspace-find-replace-navigation">
          <button
            aria-label={t('findReplace.previousMatch')}
            className="workspace-find-replace-navigation-button"
            type="button"
          >
            <FindReplaceNavigationIcon direction="up" />
          </button>
          <button
            aria-label={t('findReplace.nextMatch')}
            className="workspace-find-replace-navigation-button"
            type="button"
          >
            <FindReplaceNavigationIcon direction="down" />
          </button>
        </div>
      </div>

      <button
        aria-label={t('findReplace.close')}
        className="workspace-find-replace-close-button"
        onClick={onClose}
        type="button"
      >
        <FindReplaceCloseIcon />
      </button>

      <div className="workspace-find-replace-field workspace-find-replace-replace-field">
        <FindReplaceAssetIcon name="replace" />
        <input
          aria-label={t('findReplace.replaceInputLabel')}
          autoComplete="off"
          placeholder={t('findReplace.replacePlaceholder')}
          spellCheck={false}
          type="text"
        />
      </div>

      <button className="workspace-find-replace-action-button" type="button">
        {t('findReplace.replace')}
      </button>

      <button
        aria-pressed={allEnabled}
        className={`workspace-find-replace-all-button${
          allEnabled ? ' is-active' : ''
        }`}
        onClick={() => setAllEnabled((currentValue) => !currentValue)}
        type="button"
      >
        {t('findReplace.all')}
      </button>

      <div className="workspace-find-replace-footer">
        <div
          aria-label={t('findReplace.optionsLabel')}
          className="workspace-find-replace-options"
          role="group"
        >
          {options.map((option) => {
            const checked =
              optionOverrides[option.id] ?? option.defaultChecked ?? false

            return (
              <label className="workspace-find-replace-option" key={option.id}>
                <input
                  checked={checked}
                  onChange={() => {
                    setOptionOverrides((currentOverrides) => ({
                      ...currentOverrides,
                      [option.id]: !checked,
                    }))
                  }}
                  type="checkbox"
                />
                <span aria-hidden="true" className="workspace-find-replace-option-box" />
                <span>{t(option.labelKey)}</span>
              </label>
            )
          })}
        </div>
        <span className="workspace-find-replace-toggle-hint">
          {t('findReplace.toggleHint')}
        </span>
      </div>
    </section>
  )
}

export default WorkspaceFindReplaceMenu
