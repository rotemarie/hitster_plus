'use client'
import { useState } from 'react'
import type { Card } from '@/lib/types'
import { cleanTitle } from '@/lib/game-logic'

interface TimelineProps {
  timeline: Card[]
  isActivePlayer: boolean
  onPlace: (position: number) => void
  disabled?: boolean
  challengerSlot?: number | null
  challengerName?: string | null
}

export function Timeline({ timeline, isActivePlayer, onPlace, disabled = false, challengerSlot, challengerName }: TimelineProps) {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)

  function handlePlace() {
    if (selectedSlot === null) return
    onPlace(selectedSlot)
    setSelectedSlot(null)
  }

  const slotCount = timeline.length + 1
  const hasChallengerSlot = challengerSlot !== null && challengerSlot !== undefined

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm text-gray-400 uppercase tracking-wider">Your Timeline</h2>

      {hasChallengerSlot && (
        <p className="text-xs text-yellow-400">
          {challengerName ?? 'Opponent'} chose slot {challengerSlot! + 1} — pick a different spot
        </p>
      )}

      {timeline.length === 0 && !isActivePlayer && (
        <p className="text-gray-600 text-sm italic">No cards yet</p>
      )}

      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {Array.from({ length: slotCount }, (_, slotIndex) => {
          const isChallengersSlot = hasChallengerSlot && slotIndex === challengerSlot
          const isBlocked = isActivePlayer && isChallengersSlot

          return (
            <div key={slotIndex} className="flex items-center gap-1 flex-shrink-0">
              {isActivePlayer && !disabled && (
                isChallengersSlot ? (
                  // Challenger's chosen slot — shown but blocked for active player
                  <div
                    className="w-6 h-16 rounded flex items-center justify-center border-2 border-yellow-500 bg-yellow-500/20 cursor-not-allowed"
                    title={`${challengerName ?? 'Opponent'} chose this slot`}
                  >
                    <span className="text-yellow-400 text-xs">★</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedSlot(slotIndex === selectedSlot ? null : slotIndex)}
                    className={`w-6 h-16 rounded flex items-center justify-center transition border-2 ${
                      selectedSlot === slotIndex
                        ? 'border-green-400 bg-green-400/20'
                        : 'border-dashed border-gray-600 hover:border-gray-400'
                    }`}
                    title={`Place ${slotIndex === 0 ? 'before all' : slotIndex === timeline.length ? 'after all' : `between card ${slotIndex} and ${slotIndex + 1}`}`}
                  >
                    {selectedSlot === slotIndex && (
                      <span className="text-green-400 text-xs">▼</span>
                    )}
                  </button>
                )
              )}

              {/* For non-active players: show challenger slot indicator without interaction */}
              {!isActivePlayer && isChallengersSlot && (
                <div
                  className="w-6 h-16 rounded flex items-center justify-center border-2 border-yellow-500 bg-yellow-500/20"
                  title={`${challengerName ?? 'Opponent'} chose this slot`}
                >
                  <span className="text-yellow-400 text-xs">★</span>
                </div>
              )}

              {slotIndex < timeline.length && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-center min-w-[80px]">
                  <p className="text-green-400 font-bold text-lg">{timeline[slotIndex].year}</p>
                  <p className="text-xs text-gray-400 truncate max-w-[70px]">{cleanTitle(timeline[slotIndex].title)}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {isActivePlayer && selectedSlot !== null && (
        <button
          onClick={handlePlace}
          disabled={disabled}
          className="py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition disabled:opacity-50"
        >
          Place here (slot {selectedSlot + 1})
        </button>
      )}

      {isActivePlayer && selectedSlot === null && !disabled && (
        <p className="text-gray-500 text-sm text-center">
          {timeline.length === 0
            ? 'Click the slot to place your first card'
            : 'Click a slot between cards to place'}
        </p>
      )}
    </div>
  )
}
