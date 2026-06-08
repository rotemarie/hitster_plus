'use client'

interface TokenControlsProps {
  tokens: number
  canCallHitster: boolean
  onCallHitster: () => void
  challengerName?: string | null
}

export function TokenControls({ tokens, canCallHitster, onCallHitster, challengerName }: TokenControlsProps) {
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
      ) : canCallHitster ? (
        <button
          onClick={onCallHitster}
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
