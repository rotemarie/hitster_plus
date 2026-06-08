'use client'
import { useState } from 'react'
import type { PlayerSummary, GameSettings } from '@/lib/types'

interface LobbyViewProps {
  roomCode: string
  players: PlayerSummary[]
  settings: GameSettings
  isHost: boolean
  onStart: () => void
}

export function LobbyView({ roomCode, players, settings, isHost, onStart }: LobbyViewProps) {
  const [copied, setCopied] = useState(false)
  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/join?code=${roomCode}`
    : ''

  function copyLink() {
    navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-6">
      <h1 className="text-3xl font-bold">Waiting for players...</h1>

      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm text-center">
        <p className="text-gray-400 text-sm mb-1">Room code</p>
        <p className="text-5xl font-mono font-bold tracking-widest text-green-400">{roomCode}</p>
        <button
          onClick={copyLink}
          className="mt-4 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition"
        >
          {copied ? 'Copied!' : 'Copy invite link'}
        </button>
      </div>

      <div className="w-full max-w-sm">
        <p className="text-gray-400 text-sm mb-2">{players.length} player{players.length !== 1 ? 's' : ''} in lobby</p>
        <ul className="flex flex-col gap-2">
          {players.map(p => (
            <li key={p.id} className="bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              {p.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="text-sm text-gray-500">
        {settings.gameLength} cards to win &bull; Tokens {settings.tokensEnabled ? 'on' : 'off'}
      </div>

      {isHost && (
        <button
          onClick={onStart}
          disabled={players.length < 2}
          className="px-10 py-4 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl text-lg transition disabled:opacity-40"
        >
          {players.length < 2 ? 'Waiting for more players...' : 'Start Game'}
        </button>
      )}
      {!isHost && (
        <p className="text-gray-400">Waiting for the host to start...</p>
      )}
    </div>
  )
}
