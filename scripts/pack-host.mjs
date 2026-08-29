import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const host = path.join(root, 'host')
const api = 'https://acervinox-backend.onrender.com'

const build = spawnSync('npx', ['vite', 'build'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, VITE_API_URL: api },
})

if (build.status !== 0) process.exit(build.status ?? 1)

await rm(host, { recursive: true, force: true })
await mkdir(host, { recursive: true })
await cp(dist, host, { recursive: true })

await writeFile(
  path.join(host, '.htaccess'),
  `RewriteEngine On
RewriteBase /

RewriteCond %{HTTP_HOST} ^www\\.acervinox\\.com$ [NC]
RewriteRule ^(.*)$ https://acervinox.com/$1 [L,R=301]

RewriteRule ^index\\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

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
`,
)

console.log(`Listo: ${host}`)
console.log('Sube el contenido de host/ a public_html en Hostinger.')
console.log(`API del front: ${api}`)

const zip = spawnSync('zip', ['-r', path.join(root, 'host.zip'), '.'], {
  cwd: host,
  stdio: 'inherit',
})
if (zip.status === 0) console.log(`ZIP: ${path.join(root, 'host.zip')}`)
