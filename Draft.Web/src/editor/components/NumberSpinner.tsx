import { useRef, type WheelEvent } from 'react'

type NumberSpinnerProps = {
  label: string
  max?: number
  min: number
  onChange: (value: number) => void
  value: number
}

function StepIcon({ direction }: { direction: 'decrease' | 'increase' }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16">
      <path d="M3.5 8h9" />
      {direction === 'increase' ? <path d="M8 3.5v9" /> : null}
    </svg>
  )
}

function getInputWheelDelta(event: WheelEvent<HTMLInputElement>) {
  const dominantDelta =
    Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ? event.deltaX
      : event.deltaY

  switch (event.deltaMode) {
    case 1:
      return dominantDelta * 16
    case 2:
      return dominantDelta * event.currentTarget.clientWidth
    default:
      return dominantDelta
  }
}

function NumberSpinner({
  label,
  max,
  min,
  onChange,
  value,
}: NumberSpinnerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const decreaseDisabled = value <= min
  const increaseDisabled = max !== undefined && value >= max

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

    const boundedValue =
      max === undefined
        ? Math.max(min, parsedValue)
        : Math.min(max, Math.max(min, parsedValue))

    setSpinnerValue(boundedValue)
  }

  const handleInputWheel = (event: WheelEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const maxScrollLeft = input.scrollWidth - input.clientWidth

    if (maxScrollLeft <= 0) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    input.scrollLeft = Math.min(
      maxScrollLeft,
      Math.max(0, input.scrollLeft + getInputWheelDelta(event)),
    )
  }

  return (
    <div className="number-spinner" aria-label={label}>
      <button
        type="button"
        className="number-spinner-button"
        disabled={decreaseDisabled}
        aria-label={`Decrease ${label}`}
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
              const boundedValue =
                max === undefined ? parsedValue : Math.min(max, parsedValue)

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
        aria-label={`Increase ${label}`}
        onClick={() => {
          setSpinnerValue(
            max === undefined ? value + 1 : Math.min(max, value + 1),
          )
        }}
      >
        <StepIcon direction="increase" />
      </button>
    </div>
  )
}

export default NumberSpinner
