function Dot({ active }) {
  return <span className={`dot ${active ? 'active' : ''}`} />
}

export default function StatusPanel({ online, mic, api }) {
  return (
    <ul className="status-list">
      <li><Dot active={online} /> Online</li>
      <li><Dot active={mic} /> Microphone</li>
      <li><Dot active={api} /> API Connected</li>
    </ul>
  )
}
