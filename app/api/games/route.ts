import { NextResponse } from 'next/server'
import { saveGame } from '@/lib/redis'
import { generateRoomCode, shuffle } from '@/lib/game-logic'
import type { GameState, Player } from '@/lib/types'

export async function POST(request: Request) {
  const body = await request.json()
  const { tracks, gameLength, tokensEnabled, hostName } = body

  if (!tracks || !Array.isArray(tracks) || !hostName || !gameLength) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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
