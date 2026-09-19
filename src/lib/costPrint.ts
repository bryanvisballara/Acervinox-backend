function cop(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)
}

function esc(s: string) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

const UNITS: Record<string, string> = { und: 'und', m: 'm', m2: 'm²', dia: 'día' }

export type CostPrintLine = {
  name: string
  variant?: string
  unit?: string
  qty: number
  price: number
}

export type CostPrintGroup = {
  label: string
  lines: CostPrintLine[]
}

function lineTotal(line: CostPrintLine) {
  return Math.round((Number(line.qty) || 0) * (Number(line.price) || 0))
}

export function jobCostHtml({
  number,
  name,
  clientName,
  orderLabel,
  groups,
  totals,
  kind = 'mp',
  origin = '',
}: {
  number?: string
  name: string
  clientName?: string
  orderLabel?: string
  groups: CostPrintGroup[]
  totals: { materialTotal: number; laborTotal: number; total: number; sale50: number; resale70: number }
  kind?: 'mp' | 'inst'
  origin?: string
}) {
  const title = name || (kind === 'inst' ? 'Costo de instalación' : 'Costo de trabajo')
  const code = number || 'Sin guardar'
  const headline = kind === 'inst' ? 'Costo de instalación' : 'Costo de trabajo'
  const sumRows =
    kind === 'inst'
      ? `
    <div><span>Gastos</span><strong>${cop(totals.materialTotal)}</strong></div>
    <div><span>Tiempo de fabricación</span><strong>${cop(totals.laborTotal)}</strong></div>
    <div><span>Costo de instalación</span><strong>${cop(totals.total)}</strong></div>
    <div class="grand"><span>Con margen +50%</span><span>${cop(totals.sale50)}</span></div>`
      : `
    <div><span>Materia prima</span><strong>${cop(totals.materialTotal)}</strong></div>
    <div><span>Fabricación</span><strong>${cop(totals.laborTotal)}</strong></div>
    <div><span>Costo de MP</span><strong>${cop(totals.total)}</strong></div>
    <div><span>Venta +50%</span><strong>${cop(totals.sale50)}</strong></div>
    <div class="grand"><span>Reventa +70%</span><span>${cop(totals.resale70)}</span></div>`
  const blocks = groups
    .map((group) => {
      const sub = group.lines.reduce((s, l) => s + lineTotal(l), 0)
      const rows = group.lines
        .map(
          (line) => `
            <tr>
              <td>
                <strong>${esc(line.name)}</strong>
                <div class="muted">${esc([line.variant, UNITS[line.unit || ''] || line.unit].filter(Boolean).join(' · '))}</div>
              </td>
              <td class="num">${line.qty}</td>
              <td class="num">${cop(line.price)}</td>
              <td class="num">${cop(lineTotal(line))}</td>
            </tr>`,
        )
        .join('')
      return `
        <section>
          <div class="bar">
            <strong>${esc(group.label)}</strong>
            <span>${cop(sub)}</span>
          </div>
          <table>
            <thead>
              <tr><th>Ítem</th><th>Cant.</th><th>Precio</th><th>Total</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </section>`
    })
    .join('')

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${esc(code)} · ${esc(title)} — acervinox</title>
  <style>
    body { font-family: Arial, sans-serif; color:#111; margin:0; padding:28px; }
    .top { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; }
    .logo { height:52px; }
    h1 { margin: 8px 0 4px; font-size: 26px; }
    .code { color:#e30613; font-weight:800; }
    .muted { color:#555; font-size:13px; }
    .box { background:#16324f; color:#fff; padding:14px 16px; display:grid; grid-template-columns: 1fr 1fr; gap:6px 24px; margin:16px 0 8px; }
    .bar { background:#16324f; color:#fff; padding:8px 12px; display:flex; justify-content:space-between; gap:12px; margin:18px 0 0; font-size:14px; }
    table { width:100%; border-collapse:collapse; font-size:13px; }
    th, td { text-align:left; padding:8px 6px; border-bottom:1px solid #e5e5e5; vertical-align:top; }
    th { font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:#666; }
    .num { text-align:right; white-space:nowrap; }
    .sum { width:300px; margin-left:auto; margin-top:20px; }
    .sum div { display:flex; justify-content:space-between; padding:6px 0; }
    .grand { background:#e30613; color:#fff; padding:10px 12px; font-size:18px; font-weight:800; }
    @media print {
      body { padding:12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="top">
    ${origin ? `<img class="logo" src="${esc(origin)}/logo-acervinox.png" alt="acervinox" />` : '<strong>acervinox</strong>'}
    <div style="text-align:right">
      <div class="muted">${headline} · ${new Date().toLocaleDateString('es-CO')}</div>
      <div class="code">${esc(code)}</div>
    </div>
  </div>
  <h1>${esc(title)}</h1>
  <div class="box">
    <div>Cliente: ${esc(clientName || 'Sin cliente')}</div>
    <div>Pedido: ${esc(orderLabel || 'Sin pedido')}</div>
  </div>
  ${blocks || '<p class="muted">Este costo no tiene ítems.</p>'}
  <div class="sum">${sumRows}
  </div>
</body>
</html>`
}
