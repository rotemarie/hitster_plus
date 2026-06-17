import { NextResponse } from 'next/server'
import { getGame, saveGame } from '@/lib/redis'
import { pusher } from '@/lib/pusher'

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  const { playerId, position } = await request.json()
  const state = await getGame(params.code)

  if (!state) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (state.phase !== 'playing') return NextResponse.json({ error: 'Game not in progress' }, { status: 400 })
  if (state.turnPhase !== 'placing') return NextResponse.json({ error: 'Not in placing phase' }, { status: 400 })

  const activePlayer = state.players[state.activePlayerIndex]
  if (activePlayer.id !== playerId) return NextResponse.json({ error: 'Not your turn' }, { status: 403 })
  if (typeof position !== 'number') return NextResponse.json({ error: 'Position is required' }, { status: 400 })

  state.turnPhase = 'previewing'
  state.previewedPosition = position
  state.passedPlayerIds = []

  await saveGame(state)

  await pusher.trigger(`game-${params.code}`, 'placement-previewed', { position })

  return NextResponse.json({ ok: true })
}
