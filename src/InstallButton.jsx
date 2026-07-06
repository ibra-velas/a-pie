import { useEffect, useState } from 'react'

export default function InstallButton({ isMobile = false }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const onBeforeInstallPrompt = e => {
      // Prevent the browser from showing its own mini-infobar
      e.preventDefault()
      setDeferredPrompt(e)
    }
    const onAppInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const handleClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  // Don't render if we have no install event, or the app is already installed
  if (!deferredPrompt || installed) return null

  // Solo icono (dispositivo + flecha hacia abajo, Lucide monitor-down inlineado
  // como el resto de glifos de la casa): el chip con texto tapaba mapa de más
  return (
    <button
      onClick={handleClick}
      title="Instalar A Pie en tu dispositivo"
      aria-label="Instalar A Pie en tu dispositivo"
      style={{
        position: 'fixed',
        // Mobile: top corner — the bottom edge belongs to the sheet
        ...(isMobile ? { top: 14, right: 14 } : { bottom: 18, right: 18 }),
        zIndex: 9999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 42,
        height: 42,
        padding: 0,
        background: '#1C7A8A',
        color: '#FAF7F2',
        border: 'none',
        borderRadius: 99,
        cursor: 'pointer',
        boxShadow: '0 6px 20px rgba(28,122,138,0.35)',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 13V7" />
        <path d="m15 10-3 3-3-3" />
        <rect width="20" height="14" x="2" y="3" rx="2" />
        <path d="M12 17v4" />
        <path d="M8 21h8" />
      </svg>
    </button>
  )
}
