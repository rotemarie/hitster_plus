import { POST } from '@/app/api/games/[code]/place/route'
import type { GameState } from '@/lib/types'

const mockSave = jest.fn()
const mockTrigger = jest.fn().mockResolvedValue(undefined)

jest.mock('@/lib/redis', () => ({
  getGame: jest.fn(),
  saveGame: (...args: any[]) => mockSave(...args),
}))
jest.mock('@/lib/pusher', () => ({
  pusher: { trigger: (...args: any[]) => mockTrigger(...args) },
}))

const { getGame } = require('@/lib/redis')

function makeRequest(code: string, body: object) {
  return new Request(`http://localhost/api/games/${code}/place`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    roomCode: 'ABC123',
    phase: 'playing',
    settings: { gameLength: 5, tokensEnabled: true },
    hostId: 'p1',
    players: [
      { id: 'p1', name: 'Alice', timeline: [{ title: 'Old', artist: 'X', year: 1980 }], tokens: 0 },
      { id: 'p2', name: 'Bob', timeline: [], tokens: 2 },
    ],
    queue: [],
    currentTrack: { title: 'Mid Song', artist: 'Artist', year: 1990, previewUrl: 'https://preview' },
    activePlayerIndex: 0,
    turnPhase: 'placing',
    pendingGuess: null,
    pendingChallenge: null,
    winnerId: null,
    ...overrides,
  }
}

beforeEach(() => {
  mockSave.mockClear()
  mockTrigger.mockClear()
})

describe('POST /api/games/[code]/place', () => {
  it('returns 403 when not the active player', async () => {
    getGame.mockResolvedValue(makeState())
    const res = await POST(makeRequest('ABC123', { playerId: 'p2', position: 0 }), { params: { code: 'ABC123' } })
    expect(res.status).toBe(403)
  })

  it('returns 400 when not in placing phase', async () => {
    getGame.mockResolvedValue(makeState({ turnPhase: 'listening' }))
    const res = await POST(makeRequest('ABC123', { playerId: 'p1', position: 1 }), { params: { code: 'ABC123' } })
    expect(res.status).toBe(400)
  })

  it('adds card to active player timeline on correct placement (position 1 = after 1980 card)', async () => {
    getGame.mockResolvedValue(makeState())
    await POST(makeRequest('ABC123', { playerId: 'p1', position: 1 }), { params: { code: 'ABC123' } })
    const saved: GameState = mockSave.mock.calls[0][0]
    expect(saved.players[0].timeline).toHaveLength(2)
    expect(saved.players[0].timeline[1].year).toBe(1990)
  })

  it('discards card on incorrect placement', async () => {
    getGame.mockResolvedValue(makeState())
    // position 0 = before 1980 card, but year is 1990 — invalid
    await POST(makeRequest('ABC123', { playerId: 'p1', position: 0 }), { params: { code: 'ABC123' } })
    const saved: GameState = mockSave.mock.calls[0][0]
    expect(saved.players[0].timeline).toHaveLength(1) // unchanged
  })

  it('gives card to challenger when HITSTER is correct (placement was wrong)', async () => {
    const state = makeState({
      pendingChallenge: { challengerId: 'p2', position: 1 },
    })
    getGame.mockResolvedValue(state)
    // Wrong placement: position 0 before 1980, but year is 1990
    await POST(makeRequest('ABC123', { playerId: 'p1', position: 0 }), { params: { code: 'ABC123' } })
    const saved: GameState = mockSave.mock.calls[0][0]
    expect(saved.players[1].timeline).toHaveLength(1)
    expect(saved.players[1].timeline[0].year).toBe(1990)
    expect(saved.players[0].timeline).toHaveLength(1) // Alice unchanged
  })

  it('active player keeps card when HITSTER is incorrect (placement was correct)', async () => {
    const state = makeState({
      pendingChallenge: { challengerId: 'p2', position: 1 },
    })
    getGame.mockResolvedValue(state)
    // Correct placement: position 1 = after 1980 card, year 1990
    await POST(makeRequest('ABC123', { playerId: 'p1', position: 1 }), { params: { code: 'ABC123' } })
    const saved: GameState = mockSave.mock.calls[0][0]
    expect(saved.players[0].timeline).toHaveLength(2) // Alice gets it
    expect(saved.players[1].timeline).toHaveLength(0) // Bob gets nothing
  })

  it('awards a token when guess is correct', async () => {
    const state = makeState({
      pendingGuess: { playerId: 'p1', title: 'Mid Song', artist: 'Artist' },
    })
    getGame.mockResolvedValue(state)
    await POST(makeRequest('ABC123', { playerId: 'p1', position: 1 }), { params: { code: 'ABC123' } })
    const saved: GameState = mockSave.mock.calls[0][0]
    expect(saved.players[0].tokens).toBe(1)
  })

  it('broadcasts turn-result event', async () => {
    getGame.mockResolvedValue(makeState())
    await POST(makeRequest('ABC123', { playerId: 'p1', position: 1 }), { params: { code: 'ABC123' } })
    expect(mockTrigger).toHaveBeenCalledWith('game-ABC123', 'turn-result', expect.objectContaining({
      title: 'Mid Song',
      artist: 'Artist',
      year: 1990,
    }))
  })

  it('sets phase to finished and broadcasts game-ended when win condition met', async () => {
    const state = makeState({
      settings: { gameLength: 5, tokensEnabled: false },
      players: [
        { id: 'p1', name: 'Alice', timeline: [
          { title: 'A', artist: 'X', year: 1960 },
          { title: 'B', artist: 'X', year: 1970 },
          { title: 'C', artist: 'X', year: 1980 },
          { title: 'D', artist: 'X', year: 2000 },
        ], tokens: 0 },
        { id: 'p2', name: 'Bob', timeline: [], tokens: 0 },
      ],
      // currentTrack year=1990, position=3 places it between 1980 and 2000 cards
    })
    getGame.mockResolvedValue(state)
    await POST(makeRequest('ABC123', { playerId: 'p1', position: 3 }), { params: { code: 'ABC123' } })
    const saved: GameState = mockSave.mock.calls[0][0]
    expect(saved.phase).toBe('finished')
    expect(mockTrigger).toHaveBeenCalledWith('game-ABC123', 'game-ended', expect.objectContaining({
      winnerId: 'p1',
    }))
  })
})
