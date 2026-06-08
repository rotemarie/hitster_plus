'use client'
import { useState } from 'react'

interface GuessFormProps {
  onSubmit: (title: string, artist: string) => void
  onSkip: () => void
  disabled?: boolean
}

export function GuessForm({ onSubmit, onSkip, disabled = false }: GuessFormProps) {
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !artist.trim()) return
    onSubmit(title.trim(), artist.trim())
    setTitle('')
    setArtist('')
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-5 flex flex-col gap-4">
      <div>
        <p className="font-semibold">Can you name this song?</p>
        <p className="text-sm text-gray-400">Correct guess earns +1 token</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          className="bg-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Song title"
          disabled={disabled}
        />
        <input
          className="bg-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          value={artist}
          onChange={e => setArtist(e.target.value)}
          placeholder="Artist"
          disabled={disabled}
        />
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={disabled || !title.trim() || !artist.trim()}
            className="flex-1 py-2 bg-green-500 hover:bg-green-400 text-black font-bold rounded-lg transition disabled:opacity-50"
          >
            Guess
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={disabled}
            className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition disabled:opacity-50"
          >
            Skip
          </button>
        </div>
      </form>
    </div>
  )
}
