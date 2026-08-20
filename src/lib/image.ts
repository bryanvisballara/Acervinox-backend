export async function compressImage(file: File, maxWidth = 720, quality = 0.82) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('No se pudo leer la imagen'))
      el.src = url
    })
    const canvas = document.createElement('canvas')
    const scale = Math.min(1, maxWidth / img.width)
    canvas.width = Math.max(1, Math.round(img.width * scale))
    canvas.height = Math.max(1, Math.round(img.height * scale))
    canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function cop(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n || 0)
}

export function partAmount(part: {
  pricing?: string
  unitPrice: number
  qty?: number
  measure?: number
}) {
  if (part.pricing === 'medida') {
    return Math.round(Number(part.unitPrice || 0) * Number(part.measure || 0))
  }
  return Math.round(Number(part.unitPrice || 0) * Number(part.qty || 0))
}

export function unitLabel(unit?: string) {
  if (unit === 'm2') return 'm²'
  if (unit === 'und') return 'und'
  return 'm'
}
