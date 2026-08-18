export function Logo({ className = 'h-[58px] sm:h-[64px]' }: { className?: string }) {
  return (
    <a href="#inicio" className="block shrink-0 no-underline" aria-label="acervinox, ir al inicio">
      <img
        src="/logo-acervinox.png"
        alt="acervinox — Eficiencia forjada en acero"
        className={`${className} w-auto object-contain object-left`}
      />
    </a>
  )
}
