import { useEffect, useState } from 'react'
import { Catalog } from '../components/Catalog'
import { Contact } from '../components/Contact'
import { Craft } from '../components/Craft'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { Hero } from '../components/Hero'
import { Loader } from '../components/Loader'
import { Marquee } from '../components/Marquee'
import { Showroom } from '../components/Showroom'
import { WhatsAppFloat } from '../components/WhatsAppFloat'

export function LandingPage() {
  const [booting, setBooting] = useState(true)
  const [progress, setProgress] = useState(0)

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
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <>
      {booting && <Loader />}
      <div className="grain" />
      <div className="progress" style={{ transform: `scaleX(${progress})` }} />
      <Header />
      <main className={!booting ? 'is-ready' : ''}>
        <Hero />
        <Marquee />
        <Catalog />
        <Craft />
        <Showroom />
        <Contact />
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  )
}
