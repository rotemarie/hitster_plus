'use client'
import { AudioPlayer } from './AudioPlayer'
import { Timeline } from './Timeline'
import { GuessForm } from './GuessForm'
import { TokenControls } from './TokenControls'
import { ResultOverlay } from './ResultOverlay'
import type { ClientGameState } from '@/lib/types'

interface GameViewProps {
  gameState: ClientGameState
  myPlayerId: string
  actions: {
    submitGuess: (title: string, artist: string) => Promise<unknown>
    skipGuess: () => Promise<unknown>
    placeCard: (position: number) => Promise<unknown>
    callHitster: () => Promise<unknown>
    nextTurn: () => Promise<unknown>
  }
}

export function GameView({ gameState, myPlayerId, actions }: GameViewProps) {
  const { players, activePlayerId, previewUrl, turnPhase, lastResult, settings, myTimeline, myTokens, pendingChallengerName } = gameState
  const isActivePlayer = activePlayerId === myPlayerId
  const activePlayer = players.find(p => p.id === activePlayerId)

  return (
    <div className="flex flex-col min-h-screen p-4 gap-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {isActivePlayer ? 'Your turn' : `${activePlayer?.name ?? ''}'s turn`}
        </p>
        <div className="flex gap-2">
          {players.map(p => (
            <div
              key={p.id}
              className={`text-xs px-2 py-1 rounded-full ${p.id === activePlayerId ? 'bg-green-500 text-black font-bold' : 'bg-gray-700 text-gray-300'}`}
            >
              {p.name}: {p.cardCount}
            </div>
          ))}
        </div>
      </div>

      <AudioPlayer previewUrl={previewUrl} />

      {isActivePlayer && turnPhase === 'listening' && (
        <GuessForm
          onSubmit={actions.submitGuess}
          onSkip={actions.skipGuess}
        />
      )}

      {!isActivePlayer && turnPhase === 'listening' && (
        <div className="bg-gray-800 rounded-2xl p-4 text-center text-gray-400 text-sm">
          {activePlayer?.name} is deciding whether to guess the song...
        </div>
      )}

      <Timeline
        timeline={myTimeline}
        isActivePlayer={isActivePlayer && turnPhase === 'placing'}
        onPlace={actions.placeCard}
        disabled={turnPhase !== 'placing'}
      />

      {players.filter(p => p.id !== myPlayerId).map(p => (
        <div key={p.id} className="flex flex-col gap-2">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider">{p.name}&apos;s timeline</h3>
          {p.timeline.length === 0 ? (
            <p className="text-gray-700 text-xs italic">No cards yet</p>
          ) : (
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {p.timeline.map((card, i) => (
                <div key={i} className="bg-gray-900 border border-gray-700 rounded-xl px-2 py-1.5 text-center min-w-[72px] flex-shrink-0">
                  <p className="text-blue-400 font-bold text-base">{card.year}</p>
                  <p className="text-xs text-gray-500 truncate max-w-[60px]">{card.title}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {!isActivePlayer && turnPhase === 'placing' && settings.tokensEnabled && (
        <TokenControls
          tokens={myTokens}
          canCallHitster={myTokens > 0 && pendingChallengerName === null}
          onCallHitster={actions.callHitster}
          challengerName={pendingChallengerName}
        />
      )}

      {isActivePlayer && turnPhase === 'placing' && (
        <div className="bg-gray-800 rounded-2xl p-4 text-center text-gray-400 text-sm">
          Pick a slot on your timeline to place the card
        </div>
      )}

      {lastResult && turnPhase === 'revealing' && (
        <ResultOverlay
          result={lastResult}
          activePlayerName={activePlayer?.name ?? ''}
          myPlayerId={myPlayerId}
          isActivePlayer={isActivePlayer}
          onNext={actions.nextTurn}
        />
      )}
    </div>
  )
}
