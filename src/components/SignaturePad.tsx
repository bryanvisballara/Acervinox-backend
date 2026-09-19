import { useEffect, useRef, type PointerEvent } from 'react'

export function SignaturePad({
  value,
  onChange,
}: {
  value: string
  onChange: (data: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const ratio = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    canvas.width = width * ratio
    canvas.height = height * ratio
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#111'
    if (value) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, width, height)
      img.src = value
    } else {
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, width, height)
    }
  }, [])

  const point = (e: PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const commit = () => {
    const canvas = canvasRef.current
    if (canvas) onChange(canvas.toDataURL('image/png'))
  }

  return (
    <div className="sign-pad">
      <canvas
        ref={canvasRef}
        className="sign-pad-canvas"
        onPointerDown={(e) => {
          drawing.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          const ctx = e.currentTarget.getContext('2d')
          const p = point(e)
          ctx?.beginPath()
          ctx?.moveTo(p.x, p.y)
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return
          const ctx = e.currentTarget.getContext('2d')
          const p = point(e)
          ctx?.lineTo(p.x, p.y)
          ctx?.stroke()
        }}
        onPointerUp={() => {
          drawing.current = false
          commit()
        }}
      />
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => {
          const canvas = canvasRef.current
          const ctx = canvas?.getContext('2d')
          if (!canvas || !ctx) return
          ctx.fillStyle = '#fff'
          ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight)
          onChange('')
        }}
      >
        Borrar firma
      </button>
    </div>
  )
}
