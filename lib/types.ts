export type GamePhase = 'lobby' | 'playing' | 'finished'
export type TurnPhase = 'listening' | 'placing' | 'revealing'

export interface GameSettings {
  gameLength: 5 | 10
  tokensEnabled: boolean
}

export interface Card {
  title: string
  artist: string
  year: number
}

export interface Track extends Card {
  previewUrl: string
}

export interface Player {
  id: string
  name: string
  timeline: Card[]
  tokens: number
}

export interface PendingGuess {
  playerId: string
  title: string
  artist: string
}

export interface PendingChallenge {
  challengerId: string
  position: number
}

export interface GameState {
  roomCode: string
  phase: GamePhase
  settings: GameSettings
  hostId: string
  players: Player[]
  queue: Track[]
  currentTrack: Track | null
  activePlayerIndex: number
  turnPhase: TurnPhase
  pendingGuess: PendingGuess | null
  pendingChallenge: PendingChallenge | null
  winnerId: string | null
}

// Pusher event payload types

export interface PlayerSummary {
  id: string
  name: string
  cardCount: number
  tokens: number
  timeline: Card[]
}

export interface TurnResultPayload {
  title: string
  artist: string
  year: number
  placementCorrect: boolean
  guessCorrect: boolean
  challengeResult: 'correct' | 'incorrect' | null
  challengerId: string | null
  challengerPosition: number | null
  players: PlayerSummary[]
}

export interface TurnStartedPayload {
  activePlayerId: string
  previewUrl: string
}

export interface GameStartedPayload {
  settings: GameSettings
  players: PlayerSummary[]
  activePlayerId: string
}

export interface GameEndedPayload {
  winnerId: string | null
  winnerName: string | null
}

// Client-side game state (what the browser tracks)
export interface ClientGameState {
  phase: GamePhase
  settings: GameSettings
  players: PlayerSummary[]
  activePlayerId: string
  previewUrl: string | null
  turnPhase: TurnPhase
  lastResult: TurnResultPayload | null
  winnerId: string | null
  winnerName: string | null
  myTimeline: Card[]
  myTokens: number
  pendingChallengerName: string | null
  pendingChallengerPosition: number | null
}
