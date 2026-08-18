export function Loader() {
  return (
    <div className="loader" aria-hidden>
      <div className="loader-word" style={{ animationDelay: '0.15s' }}>
        <img
          src="/logo-acervinox.png"
          alt=""
          className="mx-auto h-28 w-auto object-contain sm:h-32"
        />
      </div>
    </div>
  )
}
