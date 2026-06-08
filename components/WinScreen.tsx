'use client'
import { useRouter } from 'next/navigation'

interface WinScreenProps {
  winnerId: string | null
  winnerName: string | null
  myPlayerId: string
}

export function WinScreen({ winnerId, winnerName, myPlayerId }: WinScreenProps) {
  const router = useRouter()
  const iWon = winnerId === myPlayerId

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-6 text-center">
      <div className="text-7xl">{iWon ? '🏆' : '🎵'}</div>
      <h1 className="text-4xl font-bold">
        {winnerId === null ? 'Game Over!' : iWon ? 'You win!' : `${winnerName} wins!`}
      </h1>
      {winnerId === null && (
        <p className="text-gray-400">The playlist ran out of songs.</p>
      )}
      {!iWon && winnerId && (
        <p className="text-gray-400">Better luck next time!</p>
      )}
      <button
        onClick={() => router.push('/')}
        className="px-8 py-4 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl text-lg transition"
      >
        Back to Home
      </button>
    </div>
  )
}
