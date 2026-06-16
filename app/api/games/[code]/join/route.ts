import { NextResponse } from 'next/server'
import { getGame, saveGame } from '@/lib/redis'
import { pusher } from '@/lib/pusher'
import type { Player } from '@/lib/types'

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  const { name } = await request.json()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const state = await getGame(params.code)
  if (!state) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (state.phase !== 'lobby') return NextResponse.json({ error: 'Game already started' }, { status: 400 })

  const playerId = crypto.randomUUID()
  const player: Player = { id: playerId, name, timeline: [], tokens: 0 }
  state.players.push(player)

  await saveGame(state)

  await pusher.trigger(`game-${params.code}`, 'player-joined', {
    player: { id: playerId, name },
    players: state.players.map(p => ({ id: p.id, name: p.name, cardCount: p.timeline.length, tokens: p.tokens, timeline: p.timeline })),
  })

  return NextResponse.json({ playerId })
}
