'use client'
import { useEffect, useState, useCallback } from 'react'
import { getPusherClient } from '@/lib/pusher-client'
import type {
  ClientGameState,
  GameSettings,
  TurnResultPayload,
  PlayerSummary,
} from '@/lib/types'

const DEFAULT_SETTINGS: GameSettings = { gameLength: 10, tokensEnabled: false }

function initialState(): ClientGameState {
  return {
    phase: 'lobby',
    settings: DEFAULT_SETTINGS,
    players: [],
    activePlayerId: '',
    previewUrl: null,
    turnPhase: 'listening',
    lastResult: null,
    winnerId: null,
    winnerName: null,
    myTimeline: [],
    myTokens: 0,
    pendingChallengerName: null,
    pendingChallengerPosition: null,
  }
}

export function useGameRoom(roomCode: string, playerId: string) {
  const [gameState, setGameState] = useState<ClientGameState>(initialState)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hostId, setHostId] = useState<string | null>(null)

  // Load initial state from server
  useEffect(() => {
    if (!roomCode || !playerId) return
    fetch(`/api/games/${roomCode}?playerId=${playerId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setHostId(data.hostId ?? null)
        setGameState({
          phase: data.phase,
          settings: data.settings,
          players: data.players,
          activePlayerId: data.activePlayerId ?? '',
          previewUrl: data.previewUrl,
          turnPhase: data.turnPhase,
          lastResult: null,
          winnerId: data.winnerId,
          winnerName: null,
          myTimeline: data.myTimeline,
          myTokens: data.myTokens,
          pendingChallengerName: null,
    pendingChallengerPosition: null,
        })
      })
      .catch(() => setError('Failed to load game state'))
  }, [roomCode, playerId])

  // Subscribe to Pusher events
  useEffect(() => {
    if (!roomCode) return
    const pusher = getPusherClient()
    const channel = pusher.subscribe(`game-${roomCode}`)

    channel.bind('pusher:subscription_succeeded', () => setConnected(true))
    channel.bind('pusher:subscription_error', () => setError('Failed to connect to game'))

    channel.bind('player-joined', (data: { players: PlayerSummary[] }) => {
      setGameState(prev => ({ ...prev, players: data.players }))
    })

    channel.bind('player-left', (data: { players: PlayerSummary[] }) => {
      setGameState(prev => ({ ...prev, players: data.players }))
    })

    channel.bind('game-started', (data: { settings: GameSettings; players: PlayerSummary[]; activePlayerId: string }) => {
      setGameState(prev => ({
        ...prev,
        phase: 'playing',
        settings: data.settings,
        players: data.players,
        activePlayerId: data.activePlayerId,
      }))
    })

    channel.bind('turn-started', (data: { activePlayerId: string; previewUrl: string }) => {
      setGameState(prev => ({
        ...prev,
        turnPhase: 'listening',
        activePlayerId: data.activePlayerId,
        previewUrl: data.previewUrl,
        lastResult: null,
        pendingChallengerName: null,
    pendingChallengerPosition: null,
      }))
    })

    channel.bind('guess-submitted', () => {
      setGameState(prev => ({ ...prev, turnPhase: 'placing' }))
    })

    channel.bind('hitster-called', (data: { challengerName: string; challengerPosition: number }) => {
      setGameState(prev => ({ ...prev, pendingChallengerName: data.challengerName, pendingChallengerPosition: data.challengerPosition }))
    })

    channel.bind('turn-result', (data: TurnResultPayload) => {
      setGameState(prev => {
        const me = data.players.find(p => p.id === playerId)
        return {
          ...prev,
          turnPhase: 'revealing',
          lastResult: data,
          players: data.players,
          myTimeline: me?.timeline ?? prev.myTimeline,
          myTokens: me?.tokens ?? prev.myTokens,
        }
      })
    })

    channel.bind('game-ended', (data: { winnerId: string | null; winnerName: string | null }) => {
      setGameState(prev => ({
        ...prev,
        phase: 'finished',
        winnerId: data.winnerId,
        winnerName: data.winnerName,
      }))
    })

    return () => { pusher.unsubscribe(`game-${roomCode}`) }
  }, [roomCode, playerId])

  const post = useCallback(async (path: string, body: object) => {
    const res = await fetch(`/api/games/${roomCode}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, ...body }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? 'Request failed')
    }
    return res.json()
  }, [roomCode, playerId])

  const actions = {
    start: () => post('start', {}),
    submitGuess: (title: string, artist: string) => post('guess', { title, artist }),
    skipGuess: () => post('guess', {}),
    placeCard: (position: number) => post('place', { position }),
    callHitster: (position: number) => post('hitster', { position }),
    nextTurn: () => post('next', {}),
  }

  return { gameState, connected, error, actions, hostId }
}
