import { useRef } from 'react'

export function CodeInput({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const digits = value.padEnd(6, ' ').slice(0, 6).split('')

  const setAt = (index: number, char: string) => {
    const clean = value.split('')
    while (clean.length < 6) clean.push('')
    clean[index] = char
    onChange(clean.join('').replace(/\s/g, '').slice(0, 6))
  }

  return (
    <div className="flex justify-between gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          className="field h-14 w-12 text-center font-display text-2xl font-bold"
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          onChange={(e) => {
            const char = e.target.value.replace(/\D/g, '').slice(-1)
            setAt(i, char)
            if (char) refs.current[i + 1]?.focus()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[i].trim()) refs.current[i - 1]?.focus()
          }}
          onPaste={(e) => {
            e.preventDefault()
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
            onChange(pasted)
          }}
          aria-label={`Dígito ${i + 1}`}
        />
      ))}
    </div>
  )
}
