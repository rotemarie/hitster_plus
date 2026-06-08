import { NextResponse } from 'next/server'
import { fetchPlaylistTracks } from '@/lib/spotify'
import { saveGame } from '@/lib/redis'
import { generateRoomCode, shuffle } from '@/lib/game-logic'
import type { GameState, Player } from '@/lib/types'

export async function POST(request: Request) {
  const body = await request.json()
  const { playlistUrl, gameLength, tokensEnabled, hostName } = body

  if (!playlistUrl || !hostName || !gameLength) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  let tracks
  try {
    tracks = await fetchPlaylistTracks(playlistUrl)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch playlist. Is the URL correct and the playlist public?' }, { status: 400 })
  }

  if (tracks.length < gameLength) {
    return NextResponse.json(
      { error: `Playlist only has ${tracks.length} tracks with previews. Need at least ${gameLength}.` },
      { status: 400 }
    )
  }

  const roomCode = generateRoomCode()
  const hostId = crypto.randomUUID()

  const host: Player = { id: hostId, name: hostName, timeline: [], tokens: 0 }

  const state: GameState = {
    roomCode,
    phase: 'lobby',
    settings: { gameLength, tokensEnabled },
    hostId,
    players: [host],
    queue: shuffle(tracks),
    currentTrack: null,
    activePlayerIndex: 0,
    turnPhase: 'listening',
    pendingGuess: null,
    pendingChallenge: null,
    winnerId: null,
  }

  await saveGame(state)

  return NextResponse.json({ roomCode, playerId: hostId })
}
