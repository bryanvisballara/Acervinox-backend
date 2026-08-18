import { useEffect, useState } from 'react'
import { Catalog } from './components/Catalog'
import { Contact } from './components/Contact'
import { Craft } from './components/Craft'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Loader } from './components/Loader'
import { LoginModal } from './components/LoginModal'
import { Marquee } from './components/Marquee'
import { Showroom } from './components/Showroom'

export default function App() {
  const [login, setLogin] = useState(false)
  const [booting, setBooting] = useState(true)
  const [progress, setProgress] = useState(0)
  const [cursor, setCursor] = useState({ x: -40, y: -40, hot: false, hide: false })

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setBooting(false)
      return
    }
    const t = window.setTimeout(() => setBooting(false), 2550)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? window.scrollY / max : 0)
    }
    const onMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const hot = Boolean(target.closest('a, button'))
      const hide = Boolean(target.closest('input, textarea'))
      setCursor({ x: e.clientX, y: e.clientY, hot, hide })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('mousemove', onMove)
    }
  }, [])

  return (
    <>
      {booting && <Loader />}
      <div className="grain" />
      <div className="progress" style={{ transform: `scaleX(${progress})` }} />
      <div
        className={`cursor ${cursor.hot ? 'hot' : ''}`}
        style={{ left: cursor.x, top: cursor.y, opacity: cursor.hide ? 0 : 1 }}
      />
      <div
        className="cursor-ring"
        style={{
          left: cursor.x,
          top: cursor.y,
          opacity: cursor.hide ? 0 : 0.7,
          transition: 'left 0.18s ease, top 0.18s ease, opacity 0.2s ease',
        }}
      />
      <Header onLogin={() => setLogin(true)} />
      <main className={!booting ? 'is-ready' : ''}>
        <Hero onLogin={() => setLogin(true)} />
        <Marquee />
        <Catalog />
        <Craft />
        <Showroom />
        <Contact />
      </main>
      <Footer />
      <LoginModal open={login} onClose={() => setLogin(false)} />
    </>
  )
}
