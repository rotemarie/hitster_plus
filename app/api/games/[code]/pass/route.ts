import { NextResponse } from 'next/server'
import { getGame, saveGame } from '@/lib/redis'
import { pusher } from '@/lib/pusher'

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  const { playerId } = await request.json()
  const state = await getGame(params.code)

  if (!state) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (state.phase !== 'playing') return NextResponse.json({ error: 'Game not in progress' }, { status: 400 })
  if (state.turnPhase !== 'previewing') return NextResponse.json({ error: 'Not in previewing phase' }, { status: 400 })

  const activePlayer = state.players[state.activePlayerIndex]
  if (activePlayer.id === playerId) return NextResponse.json({ error: 'Active player cannot pass' }, { status: 400 })
  if (!state.players.find(p => p.id === playerId)) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  // Idempotent — ignore if already passed
  if (!state.passedPlayerIds.includes(playerId)) {
    state.passedPlayerIds.push(playerId)
  }

  const nonActiveCount = state.players.length - 1
  const allPassed = state.passedPlayerIds.length >= nonActiveCount
  const alreadyChallenged = state.pendingChallenge !== null

  if (allPassed && !alreadyChallenged) {
    await saveGame(state)
    await pusher.trigger(`game-${params.code}`, 'challenge-resolved', {})
  } else {
    await saveGame(state)
  }

  return NextResponse.json({ ok: true })
}
