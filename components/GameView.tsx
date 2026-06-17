'use client'
import { cleanTitle } from '@/lib/game-logic'
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
    previewPlacement: (position: number) => Promise<unknown>
    placeCard: () => Promise<unknown>
    callHitster: (position: number) => Promise<unknown>
    nextTurn: () => Promise<unknown>
  }
}

export function GameView({ gameState, myPlayerId, actions }: GameViewProps) {
  const { players, activePlayerId, previewUrl, turnPhase, lastResult, settings, myTimeline, myTokens, pendingChallengerName, pendingChallengerPosition, previewedPosition } = gameState
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

      {/* Active player's own timeline */}
      {(turnPhase === 'placing' || turnPhase === 'previewing') && (
        <Timeline
          timeline={myTimeline}
          isActivePlayer={isActivePlayer && turnPhase === 'placing'}
          onPlace={actions.previewPlacement}
          disabled={!isActivePlayer || turnPhase !== 'placing'}
          challengerSlot={isActivePlayer && turnPhase === 'placing' ? pendingChallengerPosition : null}
          challengerName={pendingChallengerName}
          previewedSlot={isActivePlayer && turnPhase === 'previewing' ? previewedPosition : null}
        />
      )}

      {/* Active player: picking phase status */}
      {isActivePlayer && turnPhase === 'placing' && (
        <div className="bg-gray-800 rounded-2xl p-4 text-center text-gray-400 text-sm">
          Pick a slot and lock it in — opponents will then get a chance to challenge
        </div>
      )}

      {/* Active player: previewing phase — waiting for challengers, confirm button */}
      {isActivePlayer && turnPhase === 'previewing' && (
        <div className="flex flex-col gap-3">
          <div className="bg-gray-800 rounded-2xl p-4 text-center text-gray-400 text-sm">
            {pendingChallengerName
              ? `${pendingChallengerName} is challenging you!`
              : 'Waiting for opponents to decide...'}
          </div>
          <button
            onClick={() => actions.placeCard()}
            className="py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition"
          >
            Confirm placement
          </button>
        </div>
      )}

      {/* Other players' timelines */}
      {players.filter(p => p.id !== myPlayerId).map(p => {
        const isThisPlayerActive = p.id === activePlayerId
        // Show where the active player locked in their slot
        const showPreviewedSlot = isThisPlayerActive && turnPhase === 'previewing' && previewedPosition !== null

        return (
          <div key={p.id} className="flex flex-col gap-2">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider">
              {p.name}&apos;s timeline
              {isThisPlayerActive && turnPhase === 'previewing' && (
                <span className="ml-2 text-purple-400 normal-case">locked in slot {previewedPosition! + 1}</span>
              )}
            </h3>
            {p.timeline.length === 0 && !showPreviewedSlot ? (
              <p className="text-gray-700 text-xs italic">No cards yet</p>
            ) : (
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {Array.from({ length: p.timeline.length + 1 }, (_, slotIndex) => (
                  <div key={slotIndex} className="flex items-center gap-1 flex-shrink-0">
                    {showPreviewedSlot && slotIndex === previewedPosition && (
                      <div
                        className="w-5 h-14 rounded flex items-center justify-center border-2 border-purple-500 bg-purple-500/20"
                        title="Active player's chosen position"
                      >
                        <span className="text-purple-400 text-xs">▼</span>
                      </div>
                    )}
                    {slotIndex < p.timeline.length && (
                      <div className="bg-gray-900 border border-gray-700 rounded-xl px-2 py-1.5 text-center min-w-[72px]">
                        <p className="text-blue-400 font-bold text-base">{p.timeline[slotIndex].year}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[60px]">{cleanTitle(p.timeline[slotIndex].title)}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* HITSTER controls — only available once active player has locked in */}
      {!isActivePlayer && turnPhase === 'previewing' && settings.tokensEnabled && (
        <TokenControls
          tokens={myTokens}
          canCallHitster={myTokens > 0 && pendingChallengerName === null}
          onCallHitster={actions.callHitster}
          challengerName={pendingChallengerName}
          activePlayerTimeline={activePlayer?.timeline ?? []}
        />
      )}

      {lastResult && turnPhase === 'revealing' && (
        <ResultOverlay
          result={lastResult}
          activePlayerName={activePlayer?.name ?? ''}
          myPlayerId={myPlayerId}
          onNext={actions.nextTurn}
        />
      )}
    </div>
  )
}
