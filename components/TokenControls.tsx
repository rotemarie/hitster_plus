'use client'
import { useState } from 'react'
import type { Card } from '@/lib/types'
import { cleanTitle } from '@/lib/game-logic'

interface TokenControlsProps {
  tokens: number
  canCallHitster: boolean
  onCallHitster: (position: number) => void
  onPass: () => void
  challengerName?: string | null
  activePlayerTimeline: Card[]
  challengeResolved: boolean
}

export function TokenControls({ tokens, canCallHitster, onCallHitster, onPass, challengerName, activePlayerTimeline, challengeResolved }: TokenControlsProps) {
  const [picking, setPicking] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [passed, setPassed] = useState(false)

  function handleConfirmHitster() {
    if (selectedSlot === null) return
    onCallHitster(selectedSlot)
    setPicking(false)
    setSelectedSlot(null)
  }

  function handlePass() {
    setPassed(true)
    onPass()
  }

  const slotCount = activePlayerTimeline.length + 1

  if (challengeResolved && !challengerName) {
    return (
      <div className="bg-gray-800 rounded-2xl p-4 text-center text-gray-500 text-sm">
        Challenge phase over — waiting for active player to confirm
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Your tokens</span>
        <span className="font-bold text-yellow-400">{tokens} 🪙</span>
      </div>

      {challengerName ? (
        <p className="text-center text-yellow-400 font-semibold py-2">
          {challengerName} called HITSTER!
        </p>
      ) : passed ? (
        <p className="text-center text-gray-500 text-sm py-1">You passed — waiting for others...</p>
      ) : picking ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-300 text-center">Where do YOU think the card goes?</p>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {Array.from({ length: slotCount }, (_, i) => (
              <div key={i} className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setSelectedSlot(i === selectedSlot ? null : i)}
                  className={`w-6 h-14 rounded flex items-center justify-center transition border-2 ${
                    selectedSlot === i
                      ? 'border-yellow-400 bg-yellow-400/20'
                      : 'border-dashed border-gray-600 hover:border-gray-400'
                  }`}
                >
                  {selectedSlot === i && <span className="text-yellow-400 text-xs">▼</span>}
                </button>
                {i < activePlayerTimeline.length && (
                  <div className="bg-gray-700 rounded-lg px-2 py-1.5 text-center min-w-[64px]">
                    <p className="text-blue-400 font-bold text-sm">{activePlayerTimeline[i].year}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[56px]">{cleanTitle(activePlayerTimeline[i].title)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setPicking(false); setSelectedSlot(null) }}
              className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmHitster}
              disabled={selectedSlot === null}
              className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl text-sm transition disabled:opacity-40"
            >
              Confirm HITSTER
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {canCallHitster && (
            <button
              onClick={() => setPicking(true)}
              className="py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition"
            >
              Call HITSTER! (spend 1 token)
            </button>
          )}
          {!canCallHitster && (
            <p className="text-center text-gray-500 text-sm">No tokens to challenge with</p>
          )}
          <button
            onClick={handlePass}
            className="py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm transition"
          >
            Pass (no challenge)
          </button>
        </div>
      )}
    </div>
  )
}
