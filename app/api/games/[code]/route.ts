import { NextResponse } from 'next/server'
import { getGame } from '@/lib/redis'

export async function GET(
  request: Request,
  { params }: { params: { code: string } }
) {
  const { searchParams } = new URL(request.url)
  const playerId = searchParams.get('playerId')

  const state = await getGame(params.code)
  if (!state) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

  const me = playerId ? state.players.find(p => p.id === playerId) : null

  return NextResponse.json({
    roomCode: state.roomCode,
    phase: state.phase,
    settings: state.settings,
    hostId: state.hostId,
    players: state.players.map(p => ({
      id: p.id,
      name: p.name,
      cardCount: p.timeline.length,
      tokens: p.tokens,
    })),
    activePlayerId: state.players[state.activePlayerIndex]?.id ?? null,
    previewUrl: state.currentTrack?.previewUrl ?? null,
    turnPhase: state.turnPhase,
    winnerId: state.winnerId,
    // Own full timeline only — other players' years stay hidden
    myTimeline: me?.timeline ?? [],
    myTokens: me?.tokens ?? 0,
  })
}
