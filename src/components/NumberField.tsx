import { useEffect, useState } from 'react'

function parseRaw(raw: string) {
  const cleaned = raw.trim().replace(',', '.')
  if (!cleaned || cleaned === '.') return 0
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

function allowed(raw: string, decimal: boolean) {
  if (raw === '') return true
  return decimal ? /^\d*[.,]?\d*$/.test(raw) : /^\d*$/.test(raw)
}

export function NumberField({
  value,
  onChange,
  className,
  decimal = false,
}: {
  value: number
  onChange: (value: number) => void
  className?: string
  decimal?: boolean
}) {
  const [raw, setRaw] = useState(() => (value ? String(value) : ''))

  useEffect(() => {
    if (parseRaw(raw) === value) return
    setRaw(value ? String(value) : '')
  }, [value, raw])

  return (
    <input
      className={className}
      inputMode={decimal ? 'decimal' : 'numeric'}
      value={raw}
      onChange={(e) => {
        const next = e.target.value
        if (!allowed(next, decimal)) return
        setRaw(next)
        onChange(parseRaw(next))
      }}
    />
  )
}
