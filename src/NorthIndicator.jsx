export default function NorthIndicator({ bearing }) {
  return (
    <div style={{
      position: 'absolute',
      top: 12,
      right: 12,
      zIndex: 1000,
      width: 36,
      height: 36,
      background: 'white',
      borderRadius: '50%',
      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'transform 0.15s ease-out',
      transform: `rotate(${-bearing}deg)`,
    }}>
      <svg width="18" height="18" viewBox="0 0 18 18">
        <polygon points="9,1 12,9 9,7 6,9" fill="#D85A30" />
        <polygon points="9,17 12,9 9,11 6,9" fill="#999" />
      </svg>
    </div>
  )
}
