import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const host = path.join(root, 'host')
const api = 'https://acervinox-backend.onrender.com'

const htaccess = `Options -MultiViews
DirectoryIndex index.html

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  RewriteCond %{HTTP_HOST} ^www\\.acervinox\\.com$ [NC]
  RewriteRule ^(.*)$ https://acervinox.com/$1 [L,R=301]

  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ index.html [QSA,L]
</IfModule>

<IfModule LiteSpeed>
  RewriteEngine On
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ index.html [QSA,L]
</IfModule>

ErrorDocument 404 /index.html
ErrorDocument 403 /index.html

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html "access plus 0 seconds"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
</IfModule>
`

const legacyPathRedirect = `<script>
(function () {
  var path = window.location.pathname || '/';
  if (path === '/' || path === '/index.html') return;
  if (/\\.[a-z0-9]{2,8}$/i.test(path)) return;
  if (window.location.hash && window.location.hash.length > 1) return;
  window.location.replace('/#' + path + window.location.search);
})();
</script>`

const build = spawnSync('npx', ['vite', 'build'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, VITE_API_URL: api, VITE_HASH_ROUTER: '1' },
})

if (build.status !== 0) process.exit(build.status ?? 1)

await rm(host, { recursive: true, force: true })
await mkdir(host, { recursive: true })
await cp(dist, host, { recursive: true })

const indexPath = path.join(host, 'index.html')
let indexHtml = await readFile(indexPath, 'utf8')
if (!indexHtml.includes('window.location.pathname')) {
  indexHtml = indexHtml.replace('</head>', `${legacyPathRedirect}\n</head>`)
}
await writeFile(indexPath, indexHtml)
await writeFile(path.join(host, '404.html'), indexHtml)
await writeFile(path.join(host, '.htaccess'), htaccess)
await writeFile(
  path.join(host, 'SUBIR-ESTE-htaccess.txt'),
  `# Renombra este archivo a .htaccess en public_html (activa "mostrar ocultos").\n\n${htaccess}`,
)

console.log(`Listo: ${host}`)
console.log('Sube TODO host/ a public_html (incluye .htaccess).')
console.log('Hostinger usa rutas con # (ej. acervinox.com/#/admin/productos) para que F5 funcione.')
console.log(`API del front: ${api}`)

const zip = spawnSync('zip', ['-r', path.join(root, 'host.zip'), '.', '.htaccess'], {
  cwd: host,
  stdio: 'inherit',
})
if (zip.status === 0) console.log(`ZIP: ${path.join(root, 'host.zip')}`)
