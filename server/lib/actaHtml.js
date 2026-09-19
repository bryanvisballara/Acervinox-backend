function esc(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function textBlock(s) {
  return esc(s).replaceAll('\n', '<br />') || '—'
}

const RATINGS = ['', 'Deficiente', 'Regular', 'Bien', 'Muy bien', 'Excelente, los recomiendo']

export function actaHtml(acta, origin = '') {
  const date = new Date(acta.date || acta.createdAt || Date.now())
  const photos = (acta.photos || []).filter(Boolean)
  const parts = (acta.parts || []).map((p) => String(p).trim()).filter(Boolean)
  const rating = Number(acta.serviceRating) || 0

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Acta de mantenimiento ${esc(acta.number)}</title>
  <style>
    :root { --navy:#16324f; --red:#e30613; }
    body { font-family: Arial, sans-serif; color:#1a1a1a; margin:0; padding:28px; }
    .top { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; }
    .logo { height:52px; }
    h1 { margin:0 0 4px; letter-spacing:.06em; font-size:22px; }
    .num { color: var(--red); font-weight:800; }
    .muted { color:#666; font-size:12px; }
    .box { background: var(--navy); color:#fff; padding:14px 16px; display:grid; grid-template-columns: 1fr 1fr; gap:8px 24px; margin:16px 0 20px; }
    .sec { margin:16px 0; }
    .sec h2 { margin:0 0 8px; font-size:13px; letter-spacing:.12em; text-transform:uppercase; color: var(--navy); border-bottom:2px solid var(--navy); padding-bottom:4px; }
    .sec p { margin:0; font-size:13px; line-height:1.5; white-space:pre-wrap; }
    .parts { margin:0; padding-left:18px; font-size:13px; }
    .photos { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:10px; }
    .photos img { width:100%; height:180px; object-fit:cover; background:#f3f3f3; border:1px solid #e5e5e5; }
    .rate { display:flex; gap:10px; margin-top:8px; }
    .rate span { border:1px solid #ccc; padding:6px 10px; font-size:12px; }
    .rate .on { background: var(--red); color:#fff; border-color: var(--red); }
    .sign { margin-top:28px; }
    .sign img { height:70px; }
    .line { border-top:1px solid #111; width:240px; margin-top:8px; padding-top:6px; font-size:12px; }
    @media print {
      body { padding:12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
      <h1>ACTA DE MANTENIMIENTO</h1>
      <div class="num">${esc(acta.number)}</div>
      <div class="muted">Fecha: ${date.toLocaleDateString('es-CO')}</div>
    </div>
  </div>
  <div class="box">
    <div>Cliente: <strong>${esc(acta.clientName || acta.client?.name || '—')}</strong></div>
    <div>Técnico: <strong>${esc(acta.technicianName || '—')}</strong></div>
    <div>Equipo: ${esc(acta.product?.name || acta.product?.tracking || '—')}</div>
    <div>Descripción: ${esc(acta.description || '—')}</div>
  </div>
  <section class="sec">
    <h2>Situación encontrada</h2>
    <p>${textBlock(acta.situationFound)}</p>
  </section>
  <section class="sec">
    <h2>Trabajos realizados</h2>
    <p>${textBlock(acta.worksPerformed)}</p>
  </section>
  <section class="sec">
    <h2>Repuestos</h2>
    ${parts.length ? `<ul class="parts">${parts.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : '<p>—</p>'}
  </section>
  ${
    photos.length
      ? `<section class="sec"><h2>Registro fotográfico</h2><div class="photos">${photos
          .map((src) => `<img src="${src}" alt="" />`)
          .join('')}</div></section>`
      : ''
  }
  <section class="sec">
    <h2>Observaciones del técnico</h2>
    <p>${textBlock(acta.technicianNotes)}</p>
  </section>
  <section class="sec">
    <h2>Observaciones del cliente</h2>
    <p>${textBlock(acta.clientNotes)}</p>
  </section>
  <section class="sec">
    <h2>Calificación del servicio</h2>
    <div class="rate">
      ${[1, 2, 3, 4, 5]
        .map((n) => `<span class="${rating === n ? 'on' : ''}">${n} · ${RATINGS[n]}</span>`)
        .join('')}
    </div>
  </section>
  <div class="sign">
    ${acta.clientSignature ? `<img src="${acta.clientSignature}" alt="Firma del cliente" />` : '<div style="height:70px"></div>'}
    <div class="line">Firma conforme del cliente</div>
  </div>
</body>
</html>`
}
