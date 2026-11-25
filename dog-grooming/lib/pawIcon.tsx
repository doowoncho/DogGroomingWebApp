// Shared paw artwork for the generated app icons (app/icon.tsx, app/apple-icon.tsx).
export function PawIcon({ size }: { size: number }) {
  const u = size / 100
  const toe = (left: number, top: number, w: number, h: number) => (
    <div
      style={{
        position: 'absolute',
        left: left * u,
        top: top * u,
        width: w * u,
        height: h * u,
        borderRadius: '50%',
        background: 'white',
      }}
    />
  )
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        background: '#ff6b1a',
      }}
    >
      {toe(19, 34, 15, 19)}
      {toe(33, 18, 15, 20)}
      {toe(52, 18, 15, 20)}
      {toe(66, 34, 15, 19)}
      {toe(31, 47, 38, 32)}
    </div>
  )
}
