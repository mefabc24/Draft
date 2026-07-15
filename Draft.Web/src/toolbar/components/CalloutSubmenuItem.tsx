import type { CSSProperties } from 'react'
import type { CalloutType } from '../../markdown/callouts'
import { useTranslation } from '../../localization/useTranslation'
import type { ToolbarCalloutOption } from '../calloutOptions'

type CalloutSubmenuItemProps = {
  option: ToolbarCalloutOption
  onSelect: (calloutType: CalloutType) => void
  selected: boolean
}

function getToolbarAssetUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path}`
}

function CheckIcon() {
  return (
    <svg
      className="markdown-toolbar-callout-check"
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <path
        d="m3.5 8.35 2.75 2.65 6.25-6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  )
}

function CalloutSubmenuItem({
  option,
  onSelect,
  selected,
}: CalloutSubmenuItemProps) {
  const { t } = useTranslation()
  const iconUrl = getToolbarAssetUrl(option.iconPath)
  const iconStyle = {
    color: `var(${option.colorVariable}, currentColor)`,
    WebkitMaskImage: `url("${iconUrl}")`,
    maskImage: `url("${iconUrl}")`,
  } satisfies CSSProperties

  return (
    <button
      type="button"
      className={`markdown-toolbar-callout-item${
        selected ? ' is-selected' : ''
      }`}
      role="menuitemradio"
      aria-checked={selected}
      onClick={() => {
        onSelect(option.type)
      }}
    >
      <span
        aria-hidden="true"
        className="markdown-toolbar-callout-icon"
        style={iconStyle}
      />
      <span className="markdown-toolbar-callout-label">
        {t(`callout.${option.type}`, option.label)}
      </span>
      <span className="markdown-toolbar-callout-check-slot">
        {selected ? <CheckIcon /> : null}
      </span>
    </button>
  )
}

export default CalloutSubmenuItem
