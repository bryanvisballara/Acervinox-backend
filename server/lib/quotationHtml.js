function cop(n) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)
}

function esc(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

export function quotationHtml(quote, origin = '') {
  const groups = {
    importado: quote.items.filter((i) => i.origin === 'importado'),
    nacional: quote.items.filter((i) => i.origin !== 'importado'),
  }

  const block = (title, items) => {
    if (!items.length) return ''
    return `
      <div class="bar">${esc(title)}</div>
      ${items
        .map(
          (item, idx) => `
        <div class="row">
          <div class="num">${String(idx + 1).padStart(2, '0')}</div>
          ${item.image ? `<img class="pic" src="${item.image}" alt="" />` : `<div class="pic empty"></div>`}
          <div class="desc">
            <strong>${esc(item.name)}</strong>
            <div class="muted">Marca: ${esc(item.brand || 'acervinox')} · ${item.origin === 'importado' ? 'Importado' : 'Fabricación nacional'}</div>
            ${item.steelType || item.gauge ? `<div class="muted">${esc(item.steelType)} ${esc(item.gauge)}</div>` : ''}
            <ul>${[
              ...(item.specs || []).map((s) => `<li>${esc(s)}</li>`),
              ...(item.parts || []).map((p) => {
                if (p.pricing === 'medida') {
                  return `<li>${esc(p.name)} — ${p.measure || 0} ${esc(p.unit || 'm')} × ${cop(p.unitPrice)}</li>`
                }
                return `<li>${esc(p.name)} × ${p.qty || 1} — ${cop(p.unitPrice)}</li>`
              }),
            ].join('')}</ul>
          </div>
          <div class="col">${cop(item.net)}</div>
          <div class="col">${cop(item.iva)}</div>
          <div class="col total">${cop(item.total)}</div>
        </div>`,
        )
        .join('')}
    `
  }

  const valid = new Date(quote.createdAt || Date.now())
  valid.setDate(valid.getDate() + 15)

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Cotización ${esc(quote.number)}</title>
  <style>
    :root { --navy:#16324f; --red:#e30613; }
    body { font-family: Arial, sans-serif; color:#1a1a1a; margin:0; padding:28px; }
    .top { display:flex; justify-content:space-between; align-items:flex-start; }
    .logo { height:58px; }
    h1 { margin: 18px 0 4px; letter-spacing:.08em; }
    .num { color: var(--red); font-weight:800; }
    .box { background: var(--navy); color:#fff; padding:16px 18px; display:grid; grid-template-columns: 1fr 1fr; gap:6px 24px; margin:16px 0 22px; }
    .bar { background: var(--navy); color:#fff; padding:8px 12px; font-weight:700; margin-top:16px; }
    .row { display:grid; grid-template-columns: 36px 88px 1fr 110px 110px 120px; gap:10px; align-items:start; padding:12px 0; border-bottom:1px solid #e5e5e5; }
    .pic { width:88px; height:72px; object-fit:cover; background:#f3f3f3; }
    .pic.empty { border:1px dashed #ccc; }
    .desc ul { margin:6px 0 0; padding-left:16px; font-size:12px; color:#444; }
    .col { text-align:right; font-size:13px; }
    .col.total { color: var(--red); font-weight:800; }
    .muted { color:#666; font-size:12px; }
    .sum { width:280px; margin-left:auto; margin-top:18px; }
    .sum div { display:flex; justify-content:space-between; padding:6px 0; }
    .grand { background: var(--red); color:#fff; padding:10px 12px; font-size:20px; font-weight:800; }
    .thanks { font-family: Georgia, serif; font-style:italic; color: var(--red); font-size:22px; margin-top:28px; }
    @media print {
      body { padding: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .noprint { display: none; }
    }
  </style>
</head>
<body>
  <div class="top">
    <div>
      <img class="logo" src="${esc(origin)}/logo-acervinox.png" alt="acervinox" />
      <div class="muted">Equipos gastronómicos e industriales</div>
    </div>
    <div style="text-align:right">
      <h1>COTIZACIÓN</h1>
      <div class="num">${esc(quote.number)}</div>
      <div class="muted">Fecha: ${new Date(quote.createdAt || Date.now()).toLocaleDateString('es-CO')}</div>
      <div class="muted">Válido hasta: ${valid.toLocaleDateString('es-CO')}</div>
    </div>
  </div>
  <div class="box">
    <div><strong>Ofertado a</strong></div><div></div>
    <div>Cliente: ${esc(quote.clientName) || '—'}</div>
    <div>Documento: ${esc(quote.clientDocType ? `${String(quote.clientDocType).toUpperCase()} ${quote.clientDocNumber || ''}`.trim() : quote.clientDocNumber) || '—'}</div>
    <div>Teléfono: ${esc(quote.clientPhone) || '—'}</div>
    <div>Correo: ${esc(quote.clientEmail) || '—'}</div>
    <div>Segmento: ${esc(quote.clientType) || '—'}</div>
  </div>
  ${block('EQUIPOS IMPORTADOS', groups.importado)}
  ${block('EQUIPOS FABRICACIÓN NACIONAL', groups.nacional)}
  <div class="sum">
    <div><span>Subtotal</span><strong>${cop(quote.subtotal)}</strong></div>
    <div><span>IVA 19%</span><strong>${cop(quote.iva)}</strong></div>
    <div class="grand"><span>TOTAL</span><span>${cop(quote.total)}</span></div>
  </div>
  <p class="thanks">¡Gracias por confiar en acervinox!</p>
</body>
</html>`
}
