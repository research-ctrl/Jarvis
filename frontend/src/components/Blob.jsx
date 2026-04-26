export default function Blob({ intensity }) {
  const size = 180 + intensity * 220
  const radiusA = 40 + intensity * 30
  const radiusB = 60 - intensity * 15

  return (
    <div className="blob-shell">
      <div
        className="blob"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${radiusA}% ${100 - radiusA}% ${radiusB}% ${100 - radiusB}% / ${radiusB}% ${radiusA}% ${100 - radiusB}% ${100 - radiusA}%`,
          transform: `rotate(${intensity * 40}deg)`,
        }}
      />
    </div>
  )
}
