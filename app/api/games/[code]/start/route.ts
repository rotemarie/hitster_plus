import { NextResponse } from 'next/server'
import { getGame, saveGame } from '@/lib/redis'
import { pusher } from '@/lib/pusher'
import { fetchFreshPreviewUrl } from '@/lib/deezer'

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  const { playerId } = await request.json()
  const state = await getGame(params.code)

  if (!state) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (state.hostId !== playerId) return NextResponse.json({ error: 'Only the host can start the game' }, { status: 403 })
  if (state.phase !== 'lobby') return NextResponse.json({ error: 'Game already started' }, { status: 400 })
  if (state.players.length < 2) return NextResponse.json({ error: 'Need at least 2 players to start' }, { status: 400 })

  const firstTrack = state.queue.shift()!
  state.phase = 'playing'
  state.currentTrack = firstTrack
  state.turnPhase = 'listening'
  state.activePlayerIndex = 0
  state.passedPlayerIds = []

  const freshUrl = firstTrack.deezerId ? await fetchFreshPreviewUrl(firstTrack.deezerId) : null
  const previewUrl = freshUrl ?? firstTrack.previewUrl

  await saveGame(state)

  await pusher.trigger(`game-${params.code}`, 'game-started', {
    settings: state.settings,
    players: state.players.map(p => ({ id: p.id, name: p.name, cardCount: 0, tokens: 0, timeline: [] })),
    activePlayerId: state.players[0].id,
  })

  await pusher.trigger(`game-${params.code}`, 'turn-started', {
    activePlayerId: state.players[0].id,
    previewUrl,
  })

  return NextResponse.json({ ok: true })
}
