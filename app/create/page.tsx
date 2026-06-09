'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { generateCodeVerifier, generateCodeChallenge, exchangeCodeForToken } from '@/lib/spotify-pkce'
import type { Track } from '@/lib/types'

const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!

async function fetchTracksFromSpotify(playlistUrl: string, token: string): Promise<Track[]> {
  const match = playlistUrl.match(/playlist\/([A-Za-z0-9]+)/)
  if (!match) throw new Error('Invalid Spotify playlist URL')
  const playlistId = match[1]

  const tracks: Track[] = []
  let url: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`

  while (url) {
    const res: Response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`Failed to fetch playlist: ${res.status}`)
    const data: { next: string | null; items: { track: { name: string; artists: { name: string }[]; album: { release_date: string }; preview_url: string | null } | null }[] } = await res.json()

    for (const item of data.items) {
      const track = item?.track
      if (!track || !track.preview_url) continue
      tracks.push({
        title: track.name,
        artist: track.artists[0].name,
        year: parseInt(track.album.release_date.slice(0, 4), 10),
        previewUrl: track.preview_url,
      })
    }

    url = data.next ?? null
  }

  return tracks
}

export default function CreatePage() {
  const router = useRouter()
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [hostName, setHostName] = useState('')
  const [gameLength, setGameLength] = useState<5 | 10>(10)
  const [tokensEnabled, setTokensEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('spotify_token')
    if (stored) { setSpotifyToken(stored); return }

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (!code) return

    const verifier = sessionStorage.getItem('spotify_code_verifier')
    if (!verifier) return

    setConnecting(true)
    exchangeCodeForToken(code, verifier, SPOTIFY_CLIENT_ID, `${window.location.origin}/create`)
      .then(token => {
        sessionStorage.setItem('spotify_token', token)
        sessionStorage.removeItem('spotify_code_verifier')
        setSpotifyToken(token)
        router.replace('/create')
      })
      .catch(() => setError('Failed to connect Spotify. Please try again.'))
      .finally(() => setConnecting(false))
  }, [router])

  async function handleConnectSpotify() {
    const verifier = generateCodeVerifier()
    const challenge = await generateCodeChallenge(verifier)
    sessionStorage.setItem('spotify_code_verifier', verifier)

    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: `${window.location.origin}/create`,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      scope: 'playlist-read-private playlist-read-collaborative',
      show_dialog: 'true',
    })

    window.location.href = `https://accounts.spotify.com/authorize?${params}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!spotifyToken) return
    setLoading(true)
    setError('')
    try {
      let tracks: Track[]
      try {
        tracks = await fetchTracksFromSpotify(playlistUrl, spotifyToken)
      } catch (err) {
        console.error('fetchTracksFromSpotify error:', err)
        sessionStorage.removeItem('spotify_token')
        setSpotifyToken(null)
        setError(`Could not fetch playlist: ${err instanceof Error ? err.message : String(err)}`)
        setLoading(false)
        return
      }

      if (tracks.length === 0) {
        setError('This playlist has no songs with 30-second previews available.')
        setLoading(false)
        return
      }

      if (tracks.length < gameLength) {
        setError(`Playlist only has ${tracks.length} tracks with previews. Need at least ${gameLength}.`)
        setLoading(false)
        return
      }

      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracks, hostName, gameLength, tokensEnabled }),
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

  if (connecting) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        Connecting to Spotify...
      </div>
    )
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-8">Create a Game</h1>

        {!spotifyToken ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-gray-400 text-center">Connect your Spotify account to use your playlists</p>
            <button
              onClick={handleConnectSpotify}
              className="px-8 py-4 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl text-lg transition"
            >
              Connect Spotify
            </button>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex items-center gap-2 text-sm text-green-400">
              <span>✓</span>
              <span>Spotify connected</span>
              <button
                type="button"
                onClick={() => { sessionStorage.removeItem('spotify_token'); setSpotifyToken(null) }}
                className="ml-auto text-gray-500 hover:text-gray-300 text-xs"
              >
                Disconnect
              </button>
            </div>
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
              {loading ? 'Fetching playlist...' : 'Create Game'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
