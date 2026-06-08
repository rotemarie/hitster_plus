'use client'
import { useEffect, useRef, useState } from 'react'

interface AudioPlayerProps {
  previewUrl: string | null
}

export function AudioPlayer({ previewUrl }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!audioRef.current || !previewUrl) return
    audioRef.current.src = previewUrl
    audioRef.current.play().catch(() => {})
  }, [previewUrl])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => { setPlaying(false); setProgress(0) }
    const onTimeUpdate = () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration)
    }

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('timeupdate', onTimeUpdate)

    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('timeupdate', onTimeUpdate)
    }
  }, [])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    playing ? audio.pause() : audio.play().catch(() => {})
  }

  if (!previewUrl) {
    return (
      <div className="bg-gray-800 rounded-2xl p-6 flex items-center justify-center h-24">
        <p className="text-gray-500">Waiting for song...</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-6 flex flex-col gap-3">
      <audio ref={audioRef} />
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="w-12 h-12 bg-green-500 hover:bg-green-400 rounded-full flex items-center justify-center text-black font-bold text-xl transition flex-shrink-0"
        >
          {playing ? '⏸' : '▶'}
        </button>
        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-400 transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
      <p className="text-center text-gray-400 text-sm">
        {playing ? 'Playing...' : 'Paused'} — what year is this song?
      </p>
    </div>
  )
}
