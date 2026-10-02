import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import '@capacitor/core'
import './index.css'
import App from './App.tsx'

const hashRouter =
  import.meta.env.VITE_HASH_ROUTER === 'true' || import.meta.env.VITE_HASH_ROUTER === '1'
const Router = hashRouter ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
)
