import { useState, useEffect, useRef } from 'react'

const playSound = (type) => {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  
  const now = audioCtx.currentTime
  
  switch (type) {
    case 'tick': // Countdown 3-2-1
      osc.type = 'sine'
      osc.frequency.setValueAtTime(600, now)
      gain.gain.setValueAtTime(0.1, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1)
      osc.start(now)
      osc.stop(now + 0.1)
      break
    case 'change': // Word change / Start
      osc.type = 'sine'
      osc.frequency.setValueAtTime(800, now)
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1)
      gain.gain.setValueAtTime(0.1, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
      osc.start(now)
      osc.stop(now + 0.3)
      break
    case 'warning': // 3s left
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(400, now)
      gain.gain.setValueAtTime(0.05, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1)
      osc.start(now)
      osc.stop(now + 0.1)
      break
    case 'finish': // Complete
      // Arpeggio
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
         const o = audioCtx.createOscillator()
         const g = audioCtx.createGain()
         o.type = 'sine'
         o.frequency.value = freq
         g.gain.setValueAtTime(0.1, now + i * 0.1)
         g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3)
         o.connect(g)
         g.connect(audioCtx.destination)
         o.start(now + i * 0.1)
         o.stop(now + i * 0.1 + 0.3)
      })
      return
  }
  
  osc.connect(gain)
  gain.connect(audioCtx.destination)
}

function App() {
  const [inputText, setInputText] = useState('')
  const [timeInput, setTimeInput] = useState(3)
  const [words, setWords] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [startCount, setStartCount] = useState(3)
  
  const timerRef = useRef(null)

  const speak = (text) => {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    window.speechSynthesis.speak(utterance)
  }

  const handleStart = () => {
    const wordList = inputText.split('\n').map(w => w.trim()).filter(w => w.length > 0)
    if (wordList.length === 0) {
      alert('Por favor ingresa al menos una palabra.')
      return
    }
    if (timeInput <= 0) {
      alert('El tiempo debe ser mayor a 0.')
      return
    }

    setWords(wordList)
    setCurrentIndex(0)
    setIsFinished(false)
    setTimeLeft(timeInput)
    
    // Start countdown sequence
    setIsStarting(true)
    setStartCount(3)
    playSound('tick')
  }

  const handleRestart = () => {
    setIsPlaying(false)
    setIsFinished(false)
    setIsStarting(false)
    setCurrentIndex(0)
    window.speechSynthesis.cancel()
    if (timerRef.current) clearInterval(timerRef.current)
  }

  // Countdown effect
  useEffect(() => {
    if (!isStarting) return
    
    if (startCount > 0) {
       const timer = setTimeout(() => {
         setStartCount(c => {
            const next = c - 1
            if (next > 0) playSound('tick')
            return next
         })
       }, 1000)
       return () => clearTimeout(timer)
    } else {
       // Start game
       setIsStarting(false)
       setIsPlaying(true)
       playSound('change')
       speak(words[0])
    }
  }, [startCount, isStarting, words])

  useEffect(() => {
    if (!isPlaying) return

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const newValue = prev - 1
        if (newValue > 0 && newValue <= 3) {
            playSound('warning')
        }
        if (newValue <= 0) {
          return 0
        }
        return newValue
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying])

  useEffect(() => {
    if (isPlaying && timeLeft === 0) {
       const nextIndex = currentIndex + 1
       if (nextIndex < words.length) {
         setCurrentIndex(nextIndex)
         setTimeLeft(timeInput)
         playSound('change')
         speak(words[nextIndex])
       } else {
         setIsPlaying(false)
         setIsFinished(true)
         playSound('finish')
       }
    }
  }, [timeLeft, isPlaying, words, currentIndex, timeInput])

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans">
      <h1 className="text-4xl font-bold mb-8 text-blue-400">Word Trainer TTS</h1>

      {!isPlaying && !isFinished && !isStarting && (
        <div className="w-full max-w-md bg-gray-800 p-6 rounded-xl shadow-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Palabras (una por línea)</label>
            <textarea
              className="w-full h-40 p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-white placeholder-gray-400 resize-none"
              placeholder="Ejemplo:&#10;Manzana&#10;Perro&#10;Computadora"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Tiempo por palabra (segundos)</label>
            <input
              type="number"
              min="1"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-white"
              value={timeInput}
              onChange={(e) => setTimeInput(Number(e.target.value))}
            />
          </div>

          <button
            onClick={handleStart}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition duration-200 shadow-md cursor-pointer"
          >
            Iniciar
          </button>
        </div>
      )}

      {isStarting && (
        <div className="flex flex-col items-center justify-center">
           <div className="text-9xl font-bold text-yellow-400 animate-ping">
             {startCount}
           </div>
           <p className="mt-8 text-xl text-gray-400">Prepárate...</p>
        </div>
      )}

      {isPlaying && (
        <div className="flex flex-col items-center space-y-8 w-full max-w-4xl">
          <div className="text-6xl md:text-8xl font-extrabold text-center wrap-break-word w-full animate-pulse">
            {words[currentIndex]}
          </div>
          
          <div className={`text-2xl font-mono px-4 py-2 rounded-full border ${timeLeft <= 3 ? 'text-red-400 border-red-500 bg-red-900/20 animate-bounce' : 'text-gray-400 bg-gray-800 border-gray-700'}`}>
            {timeLeft}s
          </div>

          <div className="text-sm text-gray-500">
            Palabra {currentIndex + 1} de {words.length}
          </div>

          <button
            onClick={handleRestart}
            className="mt-8 px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 rounded-lg transition cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      )}

      {isFinished && (
        <div className="text-center space-y-6 bg-gray-800 p-8 rounded-xl shadow-lg">
          <h2 className="text-3xl font-bold text-green-400">¡Completado!</h2>
          <p className="text-gray-300">Has repasado {words.length} palabras.</p>
          <button
            onClick={handleRestart}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition shadow-md cursor-pointer"
          >
            Volver al inicio
          </button>
        </div>
      )}
    </div>
  )
}

export default App
