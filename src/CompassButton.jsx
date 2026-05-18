import { useRef, useState, useEffect } from 'react'

const isMobile = () => window.matchMedia('(pointer: coarse)').matches

export default function CompassButton({ onBearing }) {
  const [visible] = useState(isMobile)
  const [active, setActive] = useState(false)
  const listenerRef = useRef(null)
  const eventNameRef = useRef(null)

  useEffect(() => {
    return () => stopCompass()
  }, [])

  if (!visible) return null

  function handleHeading(heading) {
    // heading: degrees clockwise from north
    onBearing(heading)
  }

  function onAbsoluteOrientation(e) {
    // Android / modern: alpha is compass bearing when absolute=true
    if (e.absolute && e.alpha != null) {
      handleHeading(360 - e.alpha)
    }
  }

  function onWebkitOrientation(e) {
    // iOS: webkitCompassHeading is degrees from north, clockwise
    if (e.webkitCompassHeading != null) {
      handleHeading(e.webkitCompassHeading)
    }
  }

  function stopCompass() {
    if (listenerRef.current && eventNameRef.current) {
      window.removeEventListener(eventNameRef.current, listenerRef.current)
      listenerRef.current = null
      eventNameRef.current = null
    }
    onBearing(0)
    setActive(false)
  }

  async function startCompass() {
    // iOS 13+ needs explicit permission
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission()
        if (permission !== 'granted') return
      } catch {
        return
      }
      listenerRef.current = onWebkitOrientation
      eventNameRef.current = 'deviceorientation'
    } else if ('ondeviceorientationabsolute' in window) {
      // Android / Chrome
      listenerRef.current = onAbsoluteOrientation
      eventNameRef.current = 'deviceorientationabsolute'
    } else {
      // Fallback: standard deviceorientation (may not be absolute)
      listenerRef.current = onWebkitOrientation
      eventNameRef.current = 'deviceorientation'
    }

    window.addEventListener(eventNameRef.current, listenerRef.current)
    setActive(true)
  }

  async function toggle() {
    if (active) {
      stopCompass()
    } else {
      await startCompass()
    }
  }

  return (
    <button
      onClick={toggle}
      title={active ? 'Desactivar brújula' : 'Activar brújula'}
      style={{
        position: 'absolute',
        bottom: 24,
        right: 12,
        zIndex: 1000,
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: 'none',
        background: active ? '#185FA5' : 'white',
        color: active ? 'white' : '#333',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        transition: 'background 0.2s',
      }}
    >
      🧭
    </button>
  )
}
