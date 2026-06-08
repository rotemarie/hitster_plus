import { NextResponse } from 'next/server'
import { getGame, saveGame } from '@/lib/redis'
import { pusher } from '@/lib/pusher'
import { validatePlacement, insertCardSorted, guessMatchesTrack, checkWinner } from '@/lib/game-logic'
import type { Card, TurnResultPayload } from '@/lib/types'

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  const { playerId, position } = await request.json()
  const state = await getGame(params.code)

  if (!state) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (state.phase !== 'playing') return NextResponse.json({ error: 'Game not in progress' }, { status: 400 })

  const activePlayer = state.players[state.activePlayerIndex]
  if (activePlayer.id !== playerId) return NextResponse.json({ error: 'Not your turn' }, { status: 403 })
  if (state.turnPhase !== 'placing') return NextResponse.json({ error: 'Not in placing phase' }, { status: 400 })

  const track = state.currentTrack!
  const card: Card = { title: track.title, artist: track.artist, year: track.year }

  const placementCorrect = validatePlacement(activePlayer.timeline, card, position)

  const guessCorrect = state.pendingGuess
    ? guessMatchesTrack(state.pendingGuess, track)
    : false

  const challenge = state.pendingChallenge
  // A challenge is "correct" when the challenger predicted the placement was wrong and it is
  const challengeCorrect = challenge !== null && !placementCorrect

  // Award token for correct guess (max 5)
  if (guessCorrect) {
    const player = state.players.find(p => p.id === playerId)!
    player.tokens = Math.min(5, player.tokens + 1)
  }

  // Determine who gets the card
  if (challenge && challengeCorrect) {
    // Challenger earns the card — auto-place in sorted order
    const challenger = state.players.find(p => p.id === challenge.challengerId)!
    challenger.timeline = insertCardSorted(challenger.timeline, card)
  } else if (placementCorrect) {
    // Active player keeps it (regardless of wrong HITSTER call)
    activePlayer.timeline = insertCardSorted(activePlayer.timeline, card)
  }
  // else: card discarded (wrong placement, no challenge)

  const winner = checkWinner(state.players, state.settings.gameLength)

  state.turnPhase = 'revealing'
  state.pendingGuess = null
  state.pendingChallenge = null

  if (winner) {
    state.phase = 'finished'
    state.winnerId = winner.id
  }

  await saveGame(state)

  const payload: TurnResultPayload = {
    title: track.title,
    artist: track.artist,
    year: track.year,
    placementCorrect,
    guessCorrect,
    challengeResult: challenge ? (challengeCorrect ? 'correct' : 'incorrect') : null,
    challengerId: challenge?.challengerId ?? null,
    players: state.players.map(p => ({
      id: p.id,
      name: p.name,
      cardCount: p.timeline.length,
      tokens: p.tokens,
    })),
  }

  await pusher.trigger(`game-${params.code}`, 'turn-result', payload)

  if (winner) {
    await pusher.trigger(`game-${params.code}`, 'game-ended', {
      winnerId: winner.id,
      winnerName: winner.name,
    })
  }

  return NextResponse.json({ ok: true })
}
