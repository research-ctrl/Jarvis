import { useEffect, useRef, useState } from 'react'

export default function DraggableWidget({ id, title, initialPosition, children }) {
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem(`jarvis-widget-${id}`)
    return saved ? JSON.parse(saved) : initialPosition
  })
  const [dragging, setDragging] = useState(false)
  const offsetRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    localStorage.setItem(`jarvis-widget-${id}`, JSON.stringify(position))
  }, [id, position])

  const onMouseDown = (event) => {
    setDragging(true)
    offsetRef.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    }
  }

  useEffect(() => {
    const move = (event) => {
      if (!dragging) return
      setPosition({
        x: event.clientX - offsetRef.current.x,
        y: event.clientY - offsetRef.current.y,
      })
    }
    const up = () => setDragging(false)

    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
  }, [dragging])

  return (
    <section className="widget" style={{ left: position.x, top: position.y }}>
      <header className="widget-header" onMouseDown={onMouseDown}>
        <span>{title}</span>
      </header>
      <div className="widget-content">{children}</div>
    </section>
  )
}
