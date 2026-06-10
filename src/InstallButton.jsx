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

  return (
    <button
      onClick={handleClick}
      title="Instalar A Pie en tu dispositivo"
      style={{
        position: 'fixed',
        // Mobile: top corner — the bottom edge belongs to the sheet
        ...(isMobile ? { top: 14, right: 14 } : { bottom: 18, right: 18 }),
        zIndex: 9999,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        background: '#1C7A8A',
        color: '#FAF7F2',
        border: 'none',
        borderRadius: 99,
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '-0.005em',
        boxShadow: '0 6px 20px rgba(28,122,138,0.35)',
        fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      }}
    >
      <span style={{ fontSize: 15 }}>📥</span>
      Instalar A Pie
    </button>
  )
}
