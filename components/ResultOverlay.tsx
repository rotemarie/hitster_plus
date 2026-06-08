'use client'
import type { TurnResultPayload, PlayerSummary } from '@/lib/types'

interface ResultOverlayProps {
  result: TurnResultPayload
  activePlayerName: string
  myPlayerId: string
  isActivePlayer: boolean
  onNext: () => void
}

export function ResultOverlay({ result, activePlayerName, myPlayerId, isActivePlayer, onNext }: ResultOverlayProps) {
  const { title, artist, year, placementCorrect, guessCorrect, challengeResult, challengerId, players } = result

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-3xl p-8 max-w-sm w-full flex flex-col gap-5">
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-1">The song was</p>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-gray-300">{artist}</p>
          <p className="text-4xl font-bold text-green-400 mt-2">{year}</p>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${placementCorrect ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
            <span>{placementCorrect ? '✓' : '✗'}</span>
            <span>{activePlayerName}&apos;s placement was {placementCorrect ? 'correct' : 'incorrect'}</span>
          </div>

          {guessCorrect && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-900/40 text-yellow-400">
              <span>🪙</span>
              <span>{activePlayerName} named the song! +1 token</span>
            </div>
          )}

          {challengeResult === 'correct' && challengerId && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-900/40 text-yellow-400">
              <span>🎯</span>
              <span>HITSTER was correct! {players.find(p => p.id === challengerId)?.name} claims the card</span>
            </div>
          )}
          {challengeResult === 'incorrect' && challengerId && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-900/40 text-red-400">
              <span>✗</span>
              <span>HITSTER was wrong — {players.find(p => p.id === challengerId)?.name} loses a token</span>
            </div>
          )}
        </div>

        <div className="border-t border-gray-700 pt-3">
          <p className="text-xs text-gray-500 mb-2">Standings</p>
          <div className="flex flex-col gap-1">
            {[...players].sort((a, b) => b.cardCount - a.cardCount).map(p => (
              <div key={p.id} className="flex justify-between text-sm">
                <span className={p.id === myPlayerId ? 'text-green-400 font-semibold' : 'text-gray-300'}>
                  {p.name}
                </span>
                <span className="text-gray-400">{p.cardCount} cards{p.tokens > 0 ? ` · ${p.tokens}🪙` : ''}</span>
              </div>
            ))}
          </div>
        </div>

        {isActivePlayer && (
          <button
            onClick={onNext}
            className="py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition"
          >
            Next turn
          </button>
        )}
        {!isActivePlayer && (
          <p className="text-center text-gray-500 text-sm">Waiting for {activePlayerName} to continue...</p>
        )}
      </div>
    </div>
  )
}
