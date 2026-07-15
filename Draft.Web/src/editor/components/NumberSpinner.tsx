import { useRef, type WheelEvent } from 'react'
import { useTranslation } from '../../localization/useTranslation'

type NumberSpinnerProps = {
  label: string
  max?: number
  min: number
  onChange: (value: number) => void
  value: number
}

const DEFAULT_MAX = 99999

function StepIcon({ direction }: { direction: 'decrease' | 'increase' }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16">
      <path d="M3.5 8h9" />
      {direction === 'increase' ? <path d="M8 3.5v9" /> : null}
    </svg>
  )
}

function getDominantWheelDelta(event: WheelEvent<HTMLInputElement>) {
  return Math.abs(event.deltaX) > Math.abs(event.deltaY)
    ? event.deltaX
    : event.deltaY
}

function getWheelStep(event: WheelEvent<HTMLInputElement>) {
  const dominantDelta = getDominantWheelDelta(event)

  if (dominantDelta === 0) {
    return 0
  }

  return dominantDelta < 0 ? 1 : -1
}

function getBoundedSpinnerValue(
  value: number,
  step: number,
  min: number,
  max: number,
) {
  const nextValue = value + step

  return Math.min(max, Math.max(min, nextValue))
}

function NumberSpinner({
  label,
  max,
  min,
  onChange,
  value,
}: NumberSpinnerProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const maximumValue = max ?? DEFAULT_MAX
  const decreaseDisabled = value <= min
  const increaseDisabled = value >= maximumValue

  const setSpinnerValue = (nextValue: number) => {
    if (inputRef.current) {
      inputRef.current.value = String(nextValue)
    }

    onChange(nextValue)
  }

  const commitInputValue = (nextValue: string) => {
    const parsedValue = Number.parseInt(nextValue, 10)

    if (Number.isNaN(parsedValue)) {
      if (inputRef.current) {
        inputRef.current.value = String(value)
      }

      return
    }

    const boundedValue = Math.min(maximumValue, Math.max(min, parsedValue))

    setSpinnerValue(boundedValue)
  }

  const handleInputWheel = (event: WheelEvent<HTMLInputElement>) => {
    const step = getWheelStep(event)

    if (step === 0) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    const currentInputValue = Number.parseInt(event.currentTarget.value, 10)
    const currentValue = Number.isNaN(currentInputValue)
      ? value
      : currentInputValue
    const nextValue = getBoundedSpinnerValue(
      currentValue,
      step,
      min,
      maximumValue,
    )

    if (nextValue !== currentValue) {
      setSpinnerValue(nextValue)
    }
  }

  return (
    <div className="number-spinner" aria-label={label}>
      <button
        type="button"
        className="number-spinner-button"
        disabled={decreaseDisabled}
        aria-label={t('numberSpinner.decrease', { label })}
        onClick={() => {
          setSpinnerValue(Math.max(min, value - 1))
        }}
      >
        <StepIcon direction="decrease" />
      </button>
      <input
        ref={inputRef}
        type="text"
        className="number-spinner-value"
        defaultValue={value}
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={label}
        onBlur={() => {
          commitInputValue(inputRef.current?.value ?? '')
        }}
        onChange={(event) => {
          const nextValue = event.target.value.replace(/\D/g, '')
          event.target.value = nextValue

          if (nextValue !== '') {
            const parsedValue = Number.parseInt(nextValue, 10)

            if (!Number.isNaN(parsedValue) && parsedValue >= min) {
              const boundedValue = Math.min(maximumValue, parsedValue)

              if (boundedValue !== parsedValue) {
                event.target.value = String(boundedValue)
              }

              onChange(boundedValue)
            }
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur()
          }
        }}
        onWheel={handleInputWheel}
      />
      <button
        type="button"
        className="number-spinner-button"
        disabled={increaseDisabled}
        aria-label={t('numberSpinner.increase', { label })}
        onClick={() => {
          setSpinnerValue(Math.min(maximumValue, value + 1))
        }}
      >
        <StepIcon direction="increase" />
      </button>
    </div>
  )
}

export default NumberSpinner
