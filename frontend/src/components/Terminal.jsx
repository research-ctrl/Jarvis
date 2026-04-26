export default function Terminal({ lines }) {
  return (
    <div className="terminal">
      {lines.slice(-12).map((line, index) => (
        <p key={`${line.t}-${index}`}>
          <strong>{line.t}:</strong> {line.v}
        </p>
      ))}
    </div>
  )
}
