'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useGameRoom } from '@/hooks/useGameRoom'
import { LobbyView } from '@/components/LobbyView'
import { GameView } from '@/components/GameView'
import { WinScreen } from '@/components/WinScreen'

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const code = (params.code as string).toUpperCase()

  const [playerId, setPlayerId] = useState<string | null>(null)

  useEffect(() => {
    const storedId = localStorage.getItem(`hitster_player_${code}`)
    if (!storedId) {
      router.replace(`/join?code=${code}`)
      return
    }
    setPlayerId(storedId)
  }, [code, router])

  const { gameState, connected, error, actions, hostId } = useGameRoom(
    playerId ? code : '',
    playerId ?? ''
  )

  if (!playerId) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        Redirecting...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
        <p className="text-red-400 text-lg">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition"
        >
          Back to Home
        </button>
      </div>
    )
  }

  if (!connected || gameState.players.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        Connecting...
      </div>
    )
  }

  if (gameState.phase === 'lobby') {
    return (
      <LobbyView
        roomCode={code}
        players={gameState.players}
        settings={gameState.settings}
        isHost={playerId === hostId}
        onStart={actions.start}
      />
    )
  }

  if (gameState.phase === 'finished') {
    return (
      <WinScreen
        winnerId={gameState.winnerId}
        winnerName={gameState.winnerName}
        myPlayerId={playerId}
      />
    )
  }

  return (
    <GameView
      gameState={gameState}
      myPlayerId={playerId}
      actions={actions}
    />
  )
}
