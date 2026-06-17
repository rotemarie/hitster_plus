import { NextResponse } from 'next/server'
import { getGame, saveGame } from '@/lib/redis'
import { pusher } from '@/lib/pusher'
import { validatePlacement, insertCardSorted, guessMatchesTrack, checkWinner } from '@/lib/game-logic'
import type { Card, TurnResultPayload } from '@/lib/types'

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  const body = await request.json()
  const { playerId, position: bodyPosition } = body
  const state = await getGame(params.code)

  if (!state) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (state.phase !== 'playing') return NextResponse.json({ error: 'Game not in progress' }, { status: 400 })

  const activePlayer = state.players[state.activePlayerIndex]
  if (activePlayer.id !== playerId) return NextResponse.json({ error: 'Not your turn' }, { status: 403 })

  let position: number

  if (state.turnPhase === 'placing') {
    // No-token flow: position comes directly from the request
    if (typeof bodyPosition !== 'number') return NextResponse.json({ error: 'Position is required' }, { status: 400 })
    position = bodyPosition
  } else if (state.turnPhase === 'previewing') {
    if (state.previewedPosition === null) return NextResponse.json({ error: 'No position locked in' }, { status: 400 })
    const nonActiveCount = state.players.length - 1
    const resolved = state.pendingChallenge !== null || state.passedPlayerIds.length >= nonActiveCount
    if (!resolved) return NextResponse.json({ error: 'Waiting for opponents to decide' }, { status: 400 })
    position = state.previewedPosition
  } else {
    return NextResponse.json({ error: 'Not in placing or previewing phase' }, { status: 400 })
  }

  const track = state.currentTrack!
  const card: Card = { title: track.title, artist: track.artist, year: track.year }

  const placementCorrect = validatePlacement(activePlayer.timeline, card, position)

  const guessCorrect = state.pendingGuess
    ? guessMatchesTrack(state.pendingGuess, track)
    : false

  const challenge = state.pendingChallenge
  const challengeCorrect = challenge !== null && validatePlacement(activePlayer.timeline, card, challenge.position)

  if (guessCorrect) {
    const player = state.players.find(p => p.id === playerId)!
    player.tokens = Math.min(5, player.tokens + 1)
  }

  if (challenge && challengeCorrect) {
    const challenger = state.players.find(p => p.id === challenge.challengerId)!
    challenger.timeline = insertCardSorted(challenger.timeline, card)
  } else if (placementCorrect) {
    activePlayer.timeline = insertCardSorted(activePlayer.timeline, card)
  }

  const winner = checkWinner(state.players, state.settings.gameLength)

  state.turnPhase = 'revealing'
  state.pendingGuess = null
  state.pendingChallenge = null
  state.previewedPosition = null
  state.passedPlayerIds = []

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
    challengerPosition: challenge?.position ?? null,
    players: state.players.map(p => ({
      id: p.id,
      name: p.name,
      cardCount: p.timeline.length,
      tokens: p.tokens,
      timeline: p.timeline,
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
