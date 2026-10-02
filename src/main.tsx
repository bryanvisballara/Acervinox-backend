import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import '@capacitor/core'
import './index.css'
import App from './App.tsx'

const hashRouter =
  import.meta.env.VITE_HASH_ROUTER === 'true' || import.meta.env.VITE_HASH_ROUTER === '1'

/** Hostinger a veces sirve index.html con pathname (/admin/...) pero el build viejo usaba HashRouter. */
if (hashRouter && typeof window !== 'undefined') {
  const { pathname, search, hash } = window.location
  const isAsset = /\.[a-z0-9]{2,8}$/i.test(pathname)
  if (pathname && pathname !== '/' && pathname !== '/index.html' && !isAsset && (!hash || hash === '#')) {
    window.location.replace(`/#${pathname}${search}`)
  }
}

const Router = hashRouter ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
)
