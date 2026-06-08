'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreatePage() {
  const router = useRouter()
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [hostName, setHostName] = useState('')
  const [gameLength, setGameLength] = useState<5 | 10>(10)
  const [tokensEnabled, setTokensEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistUrl, hostName, gameLength, tokensEnabled }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setLoading(false); return }
      localStorage.setItem(`hitster_player_${data.roomCode}`, data.playerId)
      setLoading(false)
      router.push(`/room/${data.roomCode}`)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-8">Create a Game</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Your name</label>
            <input
              className="w-full bg-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              value={hostName}
              onChange={e => setHostName(e.target.value)}
              placeholder="Enter your name"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Spotify playlist URL</label>
            <input
              className="w-full bg-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              value={playlistUrl}
              onChange={e => setPlaylistUrl(e.target.value)}
              placeholder="https://open.spotify.com/playlist/..."
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Game length</label>
            <div className="flex gap-3">
              {([5, 10] as const).map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setGameLength(n)}
                  className={`flex-1 py-3 rounded-lg font-semibold transition ${
                    gameLength === n
                      ? 'bg-green-500 text-black'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  {n === 5 ? 'Short (5 cards)' : 'Long (10 cards)'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
            <span className="text-sm">Enable token system</span>
            <button
              type="button"
              onClick={() => setTokensEnabled(t => !t)}
              className={`w-12 h-6 rounded-full transition ${tokensEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
            >
              <span className={`block w-5 h-5 bg-white rounded-full transition transform ${tokensEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="py-4 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl text-lg transition disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Game'}
          </button>
        </form>
      </div>
    </main>
  )
}
