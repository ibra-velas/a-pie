import { useState, useEffect } from 'react'

const STEPS = [
  {
    title: '👋 Bienvenido a A Pie',
    body: 'Esta app te muestra todo lo que tienes a pocos minutos caminando desde una dirección en Tenerife. Empezamos con un ejemplo en La Laguna.',
  },
  {
    selector: '[data-tour="address"]',
    title: '📍 Tu dirección',
    body: 'Escribe una dirección o pulsa el botón 📍 para usar tu ubicación GPS.',
  },
  {
    selector: '[data-tour="minutes"]',
    title: '⏱️ Cuántos minutos',
    body: 'Desliza para elegir cuántos minutos estás dispuesto a caminar — entre 5 y 30. El polígono azul del mapa cambia en directo.',
  },
  {
    selector: '[data-tour="filters"]',
    title: '🍽️ Filtros',
    body: 'Pulsa aquí para filtrar por tipo de lugar: bares, farmacias, parques, librerías... y muchos más.',
  },
  {
    selector: '[data-tour="map"]',
    title: '🗺️ Explora el mapa',
    body: 'Pincha en cualquier punto del mapa para ver una línea desde tu origen. ¡Disfruta tu barrio!',
  },
]

export default function Tour() {
  const [step, setStep] = useState(null)
  const [rect, setRect] = useState(null)

  // Start tour on first visit
  useEffect(() => {
    if (!localStorage.getItem('aPieTourDone')) {
      // small delay so the app renders first
      setTimeout(() => setStep(0), 600)
    }
  }, [])

  // Update target position on step change, resize, scroll
  useEffect(() => {
    if (step === null) return
    const current = STEPS[step]
    if (!current.selector) {
      setRect(null)
      return
    }
    const update = () => {
      const el = document.querySelector(current.selector)
      if (el) setRect(el.getBoundingClientRect())
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [step])

  const close = () => {
    localStorage.setItem('aPieTourDone', 'true')
    setStep(null)
  }

  const next = () => {
    if (step + 1 >= STEPS.length) close()
    else setStep(step + 1)
  }

  const prev = () => {
    if (step > 0) setStep(step - 1)
  }

  if (step === null) return null

  const current = STEPS[step]
  const isLast = step + 1 >= STEPS.length

  // Position the card
  let cardStyle = {
    position: 'fixed',
    background: '#FAF7F2',
    padding: '16px 18px',
    borderRadius: 14,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    maxWidth: 320,
    width: 'calc(100% - 32px)',
    zIndex: 10001,
    border: '1px solid rgba(28,122,138,0.15)',
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  }

  if (rect) {
    const spaceBelow = window.innerHeight - rect.bottom
    const fitsBelow = spaceBelow > 200
    if (fitsBelow) {
      cardStyle.top = rect.bottom + 12
    } else {
      cardStyle.bottom = window.innerHeight - rect.top + 12
    }
    // horizontally clamp
    const idealLeft = Math.max(16, rect.left - 20)
    const maxLeft = window.innerWidth - 320 - 16
    cardStyle.left = Math.min(idealLeft, maxLeft)
  } else {
    // Center
    cardStyle.top = '50%'
    cardStyle.left = '50%'
    cardStyle.transform = 'translate(-50%, -50%)'
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(43, 40, 32, 0.45)',
          zIndex: 10000,
        }}
      />

      {/* Highlight ring around target */}
      {rect && (
        <div
          style={{
            position: 'fixed',
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            border: '3px solid #1C7A8A',
            borderRadius: 10,
            boxShadow: '0 0 0 9999px rgba(43, 40, 32, 0.15)',
            pointerEvents: 'none',
            zIndex: 10001,
            transition: 'all 0.2s ease',
          }}
        />
      )}

      {/* Tour card */}
      <div style={cardStyle}>
        <div style={{
          fontSize: 16,
          fontWeight: 700,
          color: '#1C7A8A',
          marginBottom: 8,
          letterSpacing: '-0.01em',
        }}>
          {current.title}
        </div>
        <div style={{
          fontSize: 13.5,
          color: '#2B2820',
          lineHeight: 1.5,
          marginBottom: 14,
        }}>
          {current.body}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <button
            onClick={close}
            style={{
              fontSize: 12,
              color: '#8A7F70',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 0',
            }}
          >
            Saltar
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#8A7F70' }}>{step + 1} / {STEPS.length}</span>
            {step > 0 && (
              <button
                onClick={prev}
                style={{
                  fontSize: 12,
                  padding: '6px 12px',
                  background: 'none',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  cursor: 'pointer',
                  color: '#2B2820',
                }}
              >
                Atrás
              </button>
            )}
            <button
              onClick={next}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '6px 14px',
                background: '#1C7A8A',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              {isLast ? '¡Empezar!' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
