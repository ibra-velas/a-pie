import { useEffect } from 'react'

export default function Legal({ onClose }) {
  // Close on Escape
  useEffect(() => {
    const handler = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(43, 40, 32, 0.5)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#FAF7F2',
          borderRadius: 14,
          maxWidth: 640,
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
          border: '1px solid rgba(28,122,138,0.15)',
        }}
      >
        {/* Header */}
        <div style={{
          position: 'sticky',
          top: 0,
          background: '#FAF7F2',
          padding: '18px 22px 12px',
          borderBottom: '1px solid rgba(28,122,138,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: '#1C7A8A',
            letterSpacing: '-0.01em',
          }}>
            Aviso Legal y Privacidad
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              background: 'none',
              border: 'none',
              fontSize: 22,
              cursor: 'pointer',
              color: '#8A7F70',
              lineHeight: 1,
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 22px 24px', color: '#2B2820', fontSize: 13.5, lineHeight: 1.6 }}>

          <p style={{ marginTop: 0 }}>
            <strong>A Pie</strong> es una herramienta gratuita de visualización urbana que muestra
            qué lugares puedes alcanzar caminando desde una dirección de Tenerife.
            No requiere registro ni cuenta de usuario.
          </p>

          <h3 style={sectionTitle}>Datos personales</h3>
          <p style={p}>
            No recopilamos ni almacenamos datos personales identificables. No tenemos base
            de datos de usuarios, no usamos cookies de seguimiento, no incluimos analítica.
          </p>

          <h3 style={sectionTitle}>Servicios de terceros</h3>
          <p style={p}>Para funcionar, la app envía consultas a estos proveedores:</p>

          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Servicio</th>
                <th style={th}>Qué recibe</th>
                <th style={th}>Para qué</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={td}><a href="https://wiki.osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener noreferrer" style={link}>Nominatim (OSM, Reino Unido/UE)</a></td>
                <td style={td}>Dirección tecleada o coordenadas GPS</td>
                <td style={td}>Geocodificación</td>
              </tr>
              <tr>
                <td style={td}><a href="https://heigit.org/datenschutz/" target="_blank" rel="noopener noreferrer" style={link}>OpenRouteService (HeiGIT, Alemania)</a></td>
                <td style={td}>Coordenadas y tiempo</td>
                <td style={td}>Cálculo de isócrona</td>
              </tr>
              <tr>
                <td style={td}><a href="https://carto.com/legal/" target="_blank" rel="noopener noreferrer" style={link}>CARTO (España)</a></td>
                <td style={td}>Dirección IP</td>
                <td style={td}>Tiles del mapa</td>
              </tr>
              <tr>
                <td style={td}><a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={link}>Vercel (EEUU, DPF)</a></td>
                <td style={td}>IP y headers HTTP</td>
                <td style={td}>Hosting del frontend y API</td>
              </tr>
              <tr>
                <td style={td}><a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={link}>Supabase (EEUU, SCC)</a></td>
                <td style={td}>Consultas espaciales</td>
                <td style={td}>Base de datos PostGIS</td>
              </tr>
            </tbody>
          </table>

          <h3 style={sectionTitle}>Geolocalización</h3>
          <p style={p}>
            Si pulsas el botón <strong>📍</strong>, tu navegador te pedirá permiso para acceder a
            tu ubicación. Esas coordenadas se envían a Nominatim y OpenRouteService para
            procesar tu consulta y no se almacenan en ningún sitio.
          </p>

          <h3 style={sectionTitle}>Almacenamiento local</h3>
          <p style={p}>
            Usamos <code style={code}>localStorage</code> únicamente para recordar que ya
            viste el tour de bienvenida. No es un dato personal y no se envía a ningún servidor.
          </p>

          <h3 style={sectionTitle}>Tus derechos (RGPD)</h3>
          <p style={p}>
            Como no almacenamos datos personales tuyos, no hay nada que rectificar, exportar
            ni borrar de nuestro lado. Para datos que cada tercero procese (tu IP, por ejemplo),
            consulta sus políticas enlazadas arriba.
          </p>

          <h3 style={sectionTitle}>Datos abiertos y atribución</h3>
          <p style={p}>
            Los puntos de interés mostrados provienen de{' '}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={link}>
              OpenStreetMap
            </a>{' '}
            bajo licencia <a href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noopener noreferrer" style={link}>ODbL</a>.
            Los tiles del mapa los sirve{' '}
            <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer" style={link}>CARTO</a>.
            Las isócronas las calcula <a href="https://openrouteservice.org" target="_blank" rel="noopener noreferrer" style={link}>OpenRouteService</a>.
          </p>

          <h3 style={sectionTitle}>Contacto</h3>
          <p style={p}>
            Cualquier consulta sobre privacidad puede dirigirse a través del repositorio del proyecto.
          </p>

          <p style={{ ...p, fontSize: 11, color: '#8A7F70', marginTop: 18 }}>
            Última actualización: mayo 2026
          </p>
        </div>
      </div>
    </div>
  )
}

const sectionTitle = {
  margin: '20px 0 8px',
  fontSize: 14,
  fontWeight: 700,
  color: '#1C7A8A',
  letterSpacing: '-0.005em',
}
const p = { margin: '0 0 8px' }
const link = { color: '#1C7A8A', textDecoration: 'underline', textDecorationColor: 'rgba(28,122,138,0.35)' }
const code = { background: 'rgba(28,122,138,0.08)', padding: '1px 5px', borderRadius: 4, fontSize: 12 }
const table = {
  width: '100%',
  fontSize: 12,
  borderCollapse: 'collapse',
  margin: '8px 0 14px',
  border: '1px solid rgba(28,122,138,0.15)',
  borderRadius: 8,
  overflow: 'hidden',
}
const th = {
  textAlign: 'left',
  padding: '8px 10px',
  background: 'rgba(28,122,138,0.08)',
  fontWeight: 600,
  color: '#1C7A8A',
  borderBottom: '1px solid rgba(28,122,138,0.15)',
}
const td = {
  padding: '8px 10px',
  borderBottom: '1px solid rgba(28,122,138,0.1)',
  verticalAlign: 'top',
}
