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
  if (state.phase !== 'playing') return NextResponse.json({ error: 'Game not in progress' }, { status: 400 })

  if (state.turnPhase !== 'revealing') return NextResponse.json({ error: 'Not in revealing phase' }, { status: 400 })
  if (!state.players.find(p => p.id === playerId)) return NextResponse.json({ error: 'Player not found' }, { status: 403 })

  if (state.queue.length === 0) {
    state.phase = 'finished'
    await saveGame(state)
    await pusher.trigger(`game-${params.code}`, 'game-ended', {
      winnerId: null,
      winnerName: null,
    })
    return NextResponse.json({ ok: true })
  }

  state.activePlayerIndex = (state.activePlayerIndex + 1) % state.players.length
  const nextTrack = state.queue.shift()!
  state.currentTrack = nextTrack
  state.turnPhase = 'listening'
  state.passedPlayerIds = []

  // Re-fetch a fresh preview URL so CDN links never go stale
  const freshUrl = nextTrack.deezerId ? await fetchFreshPreviewUrl(nextTrack.deezerId) : null
  const previewUrl = freshUrl ?? nextTrack.previewUrl

  await saveGame(state)

  await pusher.trigger(`game-${params.code}`, 'turn-started', {
    activePlayerId: state.players[state.activePlayerIndex].id,
    previewUrl,
  })

  return NextResponse.json({ ok: true })
}
