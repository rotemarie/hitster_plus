import { NextResponse } from 'next/server'
import { getGame, saveGame } from '@/lib/redis'
import { pusher } from '@/lib/pusher'

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  const { playerId, title, artist } = await request.json()
  const state = await getGame(params.code)

  if (!state) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (state.phase !== 'playing') return NextResponse.json({ error: 'Game not in progress' }, { status: 400 })
  if (state.players[state.activePlayerIndex].id !== playerId) {
    return NextResponse.json({ error: 'Not your turn' }, { status: 403 })
  }
  if (state.turnPhase !== 'listening') {
    return NextResponse.json({ error: 'Not in listening phase' }, { status: 400 })
  }

  state.pendingGuess = (title && artist)
    ? { playerId, title: title.trim(), artist: artist.trim() }
    : null
  state.turnPhase = 'placing'

  await saveGame(state)

  await pusher.trigger(`game-${params.code}`, 'guess-submitted', {
    activePlayerId: playerId,
  })

  return NextResponse.json({ ok: true })
}
