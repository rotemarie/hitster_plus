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
  if (state.turnPhase !== 'previewing') return NextResponse.json({ error: 'Not in previewing phase' }, { status: 400 })
  if (!state.settings.tokensEnabled) return NextResponse.json({ error: 'Tokens are disabled' }, { status: 400 })
  if (typeof position !== 'number') return NextResponse.json({ error: 'Position is required' }, { status: 400 })

  const activePlayer = state.players[state.activePlayerIndex]
  if (activePlayer.id === playerId) return NextResponse.json({ error: 'Cannot challenge your own placement' }, { status: 400 })

  if (state.pendingChallenge) {
    return NextResponse.json({ error: 'Someone already called HITSTER this turn' }, { status: 409 })
  }

  if (position === state.previewedPosition) {
    return NextResponse.json({ error: 'Must choose a different slot than the active player' }, { status: 400 })
  }

  const challenger = state.players.find(p => p.id === playerId)
  if (!challenger) return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  if (challenger.tokens < 1) return NextResponse.json({ error: 'Not enough tokens' }, { status: 400 })

  challenger.tokens -= 1
  state.pendingChallenge = { challengerId: playerId, position }

  await saveGame(state)

  await pusher.trigger(`game-${params.code}`, 'hitster-called', {
    challengerId: playerId,
    challengerName: challenger.name,
    challengerPosition: position,
  })
  // HITSTER resolves the challenge immediately — active player can now confirm
  await pusher.trigger(`game-${params.code}`, 'challenge-resolved', {})

  return NextResponse.json({ ok: true })
}
