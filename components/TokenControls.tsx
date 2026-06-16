'use client'
import { useState } from 'react'
import type { Card } from '@/lib/types'

interface TokenControlsProps {
  tokens: number
  canCallHitster: boolean
  onCallHitster: (position: number) => void
  challengerName?: string | null
  activePlayerTimeline: Card[]
}

export function TokenControls({ tokens, canCallHitster, onCallHitster, challengerName, activePlayerTimeline }: TokenControlsProps) {
  const [picking, setPicking] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)

  function handleConfirm() {
    if (selectedSlot === null) return
    onCallHitster(selectedSlot)
    setPicking(false)
    setSelectedSlot(null)
  }

  const slotCount = activePlayerTimeline.length + 1

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
                    <p className="text-xs text-gray-400 truncate max-w-[56px]">{activePlayerTimeline[i].title}</p>
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
              onClick={handleConfirm}
              disabled={selectedSlot === null}
              className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl text-sm transition disabled:opacity-40"
            >
              Confirm HITSTER
            </button>
          </div>
        </div>
      ) : canCallHitster ? (
        <button
          onClick={() => setPicking(true)}
          className="py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition"
        >
          Call HITSTER! (spend 1 token)
        </button>
      ) : (
        <p className="text-center text-gray-500 text-sm py-1">
          {tokens === 0 ? 'No tokens to challenge with' : 'Waiting for active player...'}
        </p>
      )}
    </div>
  )
}
