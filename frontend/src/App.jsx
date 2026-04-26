import { useEffect, useMemo, useRef, useState } from 'react'
import Blob from './components/Blob'
import DraggableWidget from './components/DraggableWidget'
import StatusPanel from './components/StatusPanel'
import Terminal from './components/Terminal'

const API_BASE = 'http://localhost:5000'

export default function App() {
  const [online, setOnline] = useState(false)
  const [api, setApi] = useState(false)
  const [mic, setMic] = useState(false)
  const [intensity, setIntensity] = useState(0)
  const [lines, setLines] = useState([
    { t: 'system', v: 'Jarvis initialized. Say a sentence containing "Jarvis".' },
  ])

  const recognitionRef = useRef(null)

  const SpeechRecognition = useMemo(
    () => window.SpeechRecognition || window.webkitSpeechRecognition,
    []
  )

  useEffect(() => {
    setOnline(true)
    fetch(`${API_BASE}/api/health`)
      .then((r) => r.json())
      .then(() => setApi(true))
      .catch(() => setApi(false))
  }, [])

  useEffect(() => {
    let context
    let analyser
    let rafId

    async function initMic() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        setMic(true)
        context = new AudioContext()
        analyser = context.createAnalyser()
        analyser.fftSize = 512

        const source = context.createMediaStreamSource(stream)
        source.connect(analyser)

        const data = new Uint8Array(analyser.frequencyBinCount)

        const tick = () => {
          analyser.getByteFrequencyData(data)
          const average = data.reduce((acc, v) => acc + v, 0) / data.length
          setIntensity(Math.min(1, average / 90))
          rafId = requestAnimationFrame(tick)
        }
        tick()
      } catch {
        setMic(false)
      }
    }

    initMic()
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      if (context) context.close()
    }
  }, [])

  const appendLine = (t, v) => setLines((prev) => [...prev, { t, v }])

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.03
    window.speechSynthesis.speak(utterance)
  }

  const askJarvis = async (text) => {
    appendLine('you', text)

    const response = await fetch(`${API_BASE}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })

    if (!response.ok) {
      appendLine('jarvis', 'Backend not reachable or request rejected.')
      return
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/event-stream')) {
      const data = await response.json()
      if (data.ignored) appendLine('system', data.message)
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let pending = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      pending += decoder.decode(value, { stream: true })
      const events = pending.split('\n\n')
      pending = events.pop() || ''

      for (const event of events) {
        const line = event.split('\n').find((x) => x.startsWith('data: '))
        if (!line) continue
        const payload = line.replace('data: ', '')
        if (payload === '[DONE]') continue
        appendLine('jarvis', payload)
        speak(payload)
      }
    }
  }

  useEffect(() => {
    if (!SpeechRecognition) {
      appendLine('system', 'Speech recognition API unavailable in this browser.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.continuous = true

    recognition.onresult = async (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim()
      if (!transcript) return

      if (transcript.toLowerCase().includes('jarvis')) {
        await askJarvis(transcript)
      } else {
        appendLine('system', `Ignored (wake word missing): ${transcript}`)
      }
    }

    recognition.onerror = () => appendLine('system', 'Speech recognition error occurred.')
    recognition.onend = () => recognition.start()

    recognitionRef.current = recognition
    recognition.start()

    return () => {
      recognition.onend = null
      recognition.stop()
    }
  }, [SpeechRecognition])

  return (
    <main className="app-bg">
      <h1 className="app-title">JARVIS</h1>

      <DraggableWidget id="blob" title="Voice Core" initialPosition={{ x: 80, y: 120 }}>
        <Blob intensity={intensity} />
      </DraggableWidget>

      <DraggableWidget id="terminal" title="Terminal" initialPosition={{ x: 480, y: 110 }}>
        <Terminal lines={lines} />
      </DraggableWidget>

      <DraggableWidget id="status" title="Status" initialPosition={{ x: 500, y: 430 }}>
        <StatusPanel online={online} mic={mic} api={api} />
      </DraggableWidget>
    </main>
  )
}
