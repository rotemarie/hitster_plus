# Hitster Plus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time remote multiplayer web app version of Hitster where players race to build a correct chronological song timeline, drawing from a Spotify playlist.

**Architecture:** Next.js 14 App Router handles both frontend and API routes. All game logic is server-authoritative — clients send actions to API routes which validate, update state in Upstash Redis, and broadcast results via Pusher WebSocket channels. Music plays as Spotify 30-second preview MP3s in-browser; no Spotify login required for players.

**Tech Stack:** Next.js 14, TypeScript 5, Tailwind CSS 3, Upstash Redis (`@upstash/redis`), Pusher (`pusher` server + `pusher-js` client), Spotify Web API (Client Credentials flow), Jest 29 + Testing Library

---

## File Structure

```
hitster_plus/
├── app/
│   ├── layout.tsx                         # Root layout with font + metadata
│   ├── globals.css
│   ├── page.tsx                           # Home: Create Game / Join Game
│   ├── create/page.tsx                    # Create game form
│   ├── join/page.tsx                      # Join by code form (pre-fills from ?code=)
│   └── room/[code]/page.tsx               # Client component — all game phases
├── app/api/games/
│   ├── route.ts                           # POST: create game
│   └── [code]/
│       ├── route.ts                       # GET: player's current state (reconnect)
│       ├── join/route.ts                  # POST: join game
│       ├── start/route.ts                 # POST: host starts game
│       ├── guess/route.ts                 # POST: active player submits/skips guess
│       ├── place/route.ts                 # POST: active player places card
│       ├── hitster/route.ts               # POST: player calls HITSTER challenge
│       └── next/route.ts                  # POST: active player advances to next turn
├── components/
│   ├── LobbyView.tsx                      # Waiting room: player list, share link, Start
│   ├── GameView.tsx                       # Assembles AudioPlayer + Timeline + GuessForm + TokenControls
│   ├── AudioPlayer.tsx                    # Plays preview_url via HTML5 Audio
│   ├── Timeline.tsx                       # Horizontal card row with clickable placement slots
│   ├── GuessForm.tsx                      # Title + artist guess form (active player only)
│   ├── TokenControls.tsx                  # Token count + HITSTER button (non-active players)
│   ├── ResultOverlay.tsx                  # Full-screen overlay after each turn
│   └── WinScreen.tsx                      # Winner announcement + Play Again
├── hooks/
│   └── useGameRoom.ts                     # Pusher subscription + client game state
├── lib/
│   ├── types.ts                           # All shared TypeScript types
│   ├── game-logic.ts                      # Pure functions: validate, resolve, shuffle
│   ├── spotify.ts                         # Client Credentials auth + playlist fetch
│   ├── redis.ts                           # Upstash client + getGame/saveGame helpers
│   ├── pusher.ts                          # Pusher server SDK singleton
│   └── pusher-client.ts                   # Pusher browser SDK singleton
├── __tests__/
│   ├── game-logic.test.ts
│   ├── spotify.test.ts
│   ├── api-create.test.ts
│   └── api-place.test.ts
├── .env.local                             # Gitignored — real secrets
├── .env.example                           # Committed — shows required vars
├── jest.config.ts
├── jest.setup.ts
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

**Turn phase model** (3 server phases):
- `listening`: song plays, active player submits/skips title+artist guess → `POST /guess` → transitions to `placing`
- `placing`: active player picks timeline slot + submits, others may call HITSTER → `POST /place` → transitions to `revealing`
- `revealing`: results shown → active player calls `POST /next` → transitions to `listening` for next turn

---

## Task 1: Project Scaffold

**Files:**
- Create: `next.config.ts`, `jest.config.ts`, `jest.setup.ts`, `.env.example`, `app/globals.css`, `app/layout.tsx`
- Modify: `package.json`, `tsconfig.json`, `tailwind.config.ts`

- [ ] **Step 1: Scaffold Next.js inside the existing repo**

```bash
npx create-next-app@14 . --typescript --tailwind --eslint --app --no-src-dir --import-alias="@/*"
```

When prompted, answer: Yes to TypeScript, Yes to ESLint, Yes to Tailwind, Yes to App Router, No to src directory.

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install @upstash/redis pusher pusher-js
```

- [ ] **Step 3: Install dev/test dependencies**

```bash
npm install --save-dev jest @types/jest ts-jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 4: Write `jest.config.ts`**

```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testPathPattern: '__tests__',
}

export default createJestConfig(config)
```

- [ ] **Step 5: Write `jest.setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Write `.env.example`**

```
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

PUSHER_APP_ID=your_pusher_app_id
PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
PUSHER_CLUSTER=eu

NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
NEXT_PUBLIC_PUSHER_CLUSTER=eu

UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

- [ ] **Step 7: Add test script to `package.json`**

In `package.json`, confirm `"scripts"` includes:

```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 8: Update `app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Hitster Plus',
  description: 'Play Hitster with friends online using your Spotify playlist',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-white min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 9: Verify the app builds**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Tailwind, Jest, and dependencies"
```

---

## Task 2: Shared Types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Write `lib/types.ts`**

```typescript
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
}

export interface TurnResultPayload {
  title: string
  artist: string
  year: number
  placementCorrect: boolean
  guessCorrect: boolean
  challengeResult: 'correct' | 'incorrect' | null
  challengerId: string | null
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
  pendingChallengerName: string | null  // name of player who called HITSTER this turn
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: Pure Game Logic

**Files:**
- Create: `lib/game-logic.ts`, `__tests__/game-logic.test.ts`

- [ ] **Step 1: Write the failing tests in `__tests__/game-logic.test.ts`**

```typescript
import {
  generateRoomCode,
  validatePlacement,
  insertCardSorted,
  guessMatchesTrack,
  shuffle,
  checkWinner,
} from '@/lib/game-logic'
import type { Card, Track, Player } from '@/lib/types'

const makeCard = (year: number): Card => ({ title: `Song ${year}`, artist: 'Artist', year })
const makeTrack = (year: number): Track => ({ ...makeCard(year), previewUrl: `https://example.com/${year}.mp3` })
const makePlayer = (cardCount: number): Player => ({
  id: 'p1',
  name: 'Alice',
  timeline: Array.from({ length: cardCount }, (_, i) => makeCard(1990 + i * 5)),
  tokens: 0,
})

describe('generateRoomCode', () => {
  it('returns 6 uppercase alphanumeric characters', () => {
    const code = generateRoomCode()
    expect(code).toMatch(/^[A-Z0-9]{6}$/)
  })
  it('returns different codes on successive calls', () => {
    const codes = new Set(Array.from({ length: 20 }, generateRoomCode))
    expect(codes.size).toBeGreaterThan(15)
  })
})

describe('validatePlacement', () => {
  const timeline: Card[] = [makeCard(1980), makeCard(1990), makeCard(2000)]

  it('accepts a card placed before all existing cards', () => {
    expect(validatePlacement(timeline, makeCard(1970), 0)).toBe(true)
  })
  it('accepts a card placed between two existing cards', () => {
    expect(validatePlacement(timeline, makeCard(1985), 1)).toBe(true)
  })
  it('accepts a card placed after all existing cards', () => {
    expect(validatePlacement(timeline, makeCard(2010), 3)).toBe(true)
  })
  it('rejects a card placed too early (year too high for position)', () => {
    expect(validatePlacement(timeline, makeCard(1995), 0)).toBe(false)
  })
  it('rejects a card placed too late (year too low for position)', () => {
    expect(validatePlacement(timeline, makeCard(1975), 2)).toBe(false)
  })
  it('accepts placement on an empty timeline', () => {
    expect(validatePlacement([], makeCard(1990), 0)).toBe(true)
  })
})

describe('insertCardSorted', () => {
  it('inserts a card before all existing cards', () => {
    const timeline = [makeCard(1990), makeCard(2000)]
    const result = insertCardSorted(timeline, makeCard(1980))
    expect(result.map(c => c.year)).toEqual([1980, 1990, 2000])
  })
  it('inserts a card in the middle', () => {
    const timeline = [makeCard(1980), makeCard(2000)]
    const result = insertCardSorted(timeline, makeCard(1990))
    expect(result.map(c => c.year)).toEqual([1980, 1990, 2000])
  })
  it('inserts a card after all existing cards', () => {
    const timeline = [makeCard(1980), makeCard(1990)]
    const result = insertCardSorted(timeline, makeCard(2000))
    expect(result.map(c => c.year)).toEqual([1980, 1990, 2000])
  })
  it('does not mutate the original array', () => {
    const timeline = [makeCard(1990)]
    insertCardSorted(timeline, makeCard(1980))
    expect(timeline).toHaveLength(1)
  })
})

describe('guessMatchesTrack', () => {
  const track = makeTrack(1990)
  track.title = 'Bohemian Rhapsody'
  track.artist = 'Queen'

  it('matches exact title and artist', () => {
    expect(guessMatchesTrack({ title: 'Bohemian Rhapsody', artist: 'Queen' }, track)).toBe(true)
  })
  it('matches case-insensitively', () => {
    expect(guessMatchesTrack({ title: 'bohemian rhapsody', artist: 'queen' }, track)).toBe(true)
  })
  it('matches with surrounding whitespace', () => {
    expect(guessMatchesTrack({ title: '  Bohemian Rhapsody  ', artist: '  Queen  ' }, track)).toBe(true)
  })
  it('rejects wrong title', () => {
    expect(guessMatchesTrack({ title: 'We Will Rock You', artist: 'Queen' }, track)).toBe(false)
  })
  it('rejects wrong artist', () => {
    expect(guessMatchesTrack({ title: 'Bohemian Rhapsody', artist: 'The Beatles' }, track)).toBe(false)
  })
})

describe('shuffle', () => {
  it('returns an array of the same length', () => {
    const arr = [1, 2, 3, 4, 5]
    expect(shuffle(arr)).toHaveLength(5)
  })
  it('contains the same elements', () => {
    const arr = [1, 2, 3, 4, 5]
    expect(shuffle(arr).sort()).toEqual([1, 2, 3, 4, 5])
  })
  it('does not mutate the original array', () => {
    const arr = [1, 2, 3]
    shuffle(arr)
    expect(arr).toEqual([1, 2, 3])
  })
})

describe('checkWinner', () => {
  it('returns null when no player has reached the target', () => {
    const players = [makePlayer(3), makePlayer(4)]
    expect(checkWinner(players, 5)).toBeNull()
  })
  it('returns the winning player', () => {
    const players = [makePlayer(3), makePlayer(5)]
    expect(checkWinner(players, 5)).toBe(players[1])
  })
  it('returns the first player if multiple reached target', () => {
    const players = [makePlayer(5), makePlayer(5)]
    expect(checkWinner(players, 5)).toBe(players[0])
  })
})
```

- [ ] **Step 2: Run tests to confirm they all fail**

```bash
npm test -- __tests__/game-logic.test.ts
```

Expected: All tests fail with "Cannot find module '@/lib/game-logic'".

- [ ] **Step 3: Write `lib/game-logic.ts`**

```typescript
import type { Card, Track, Player } from './types'

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// position is the insertion index: 0 = before all cards, timeline.length = after all cards
export function validatePlacement(timeline: Card[], newCard: Card, position: number): boolean {
  const prev = timeline[position - 1]
  const next = timeline[position]
  if (prev !== undefined && prev.year > newCard.year) return false
  if (next !== undefined && next.year < newCard.year) return false
  return true
}

// Returns a new array with card inserted in chronological order
export function insertCardSorted(timeline: Card[], card: Card): Card[] {
  const index = timeline.findIndex(c => c.year > card.year)
  if (index === -1) return [...timeline, card]
  return [...timeline.slice(0, index), card, ...timeline.slice(index)]
}

export function guessMatchesTrack(
  guess: { title: string; artist: string },
  track: Track
): boolean {
  const norm = (s: string) => s.toLowerCase().trim()
  return norm(guess.title) === norm(track.title) && norm(guess.artist) === norm(track.artist)
}

export function checkWinner(players: Player[], gameLength: number): Player | null {
  return players.find(p => p.timeline.length >= gameLength) ?? null
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- __tests__/game-logic.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/game-logic.ts __tests__/game-logic.test.ts
git commit -m "feat: add pure game logic with tests"
```

---

## Task 4: Spotify Client

**Files:**
- Create: `lib/spotify.ts`, `__tests__/spotify.test.ts`

- [ ] **Step 1: Write failing tests in `__tests__/spotify.test.ts`**

```typescript
import { extractPlaylistId, buildTrackFromSpotify } from '@/lib/spotify'

describe('extractPlaylistId', () => {
  it('extracts ID from a standard playlist URL', () => {
    expect(extractPlaylistId('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M'))
      .toBe('37i9dQZF1DXcBWIGoYBM5M')
  })
  it('extracts ID from a URL with query params', () => {
    expect(extractPlaylistId('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc123'))
      .toBe('37i9dQZF1DXcBWIGoYBM5M')
  })
  it('throws on an invalid URL', () => {
    expect(() => extractPlaylistId('https://open.spotify.com/album/xyz')).toThrow('Invalid Spotify playlist URL')
  })
})

describe('buildTrackFromSpotify', () => {
  const item = {
    track: {
      name: 'Space Oddity',
      artists: [{ name: 'David Bowie' }, { name: 'Other' }],
      album: { release_date: '1969-07-11' },
      preview_url: 'https://p.scdn.co/mp3-preview/abc123',
    },
  }

  it('maps name to title', () => {
    expect(buildTrackFromSpotify(item)?.title).toBe('Space Oddity')
  })
  it('uses first artist only', () => {
    expect(buildTrackFromSpotify(item)?.artist).toBe('David Bowie')
  })
  it('extracts year from release_date', () => {
    expect(buildTrackFromSpotify(item)?.year).toBe(1969)
  })
  it('maps preview_url', () => {
    expect(buildTrackFromSpotify(item)?.previewUrl).toBe('https://p.scdn.co/mp3-preview/abc123')
  })
  it('returns null when preview_url is missing', () => {
    const noPreview = { track: { ...item.track, preview_url: null } }
    expect(buildTrackFromSpotify(noPreview)).toBeNull()
  })
  it('returns null when track is null', () => {
    expect(buildTrackFromSpotify({ track: null })).toBeNull()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- __tests__/spotify.test.ts
```

Expected: Fails with "Cannot find module '@/lib/spotify'".

- [ ] **Step 3: Write `lib/spotify.ts`**

```typescript
import type { Track } from './types'

export function extractPlaylistId(url: string): string {
  const match = url.match(/playlist\/([A-Za-z0-9]+)/)
  if (!match) throw new Error('Invalid Spotify playlist URL')
  return match[1]
}

export function buildTrackFromSpotify(item: any): Track | null {
  const track = item?.track
  if (!track || !track.preview_url) return null
  return {
    title: track.name,
    artist: track.artists[0].name,
    year: parseInt(track.album.release_date.slice(0, 4), 10),
    previewUrl: track.preview_url,
  }
}

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) throw new Error(`Spotify auth failed: ${res.status}`)
  const data = await res.json()
  return data.access_token
}

export async function fetchPlaylistTracks(playlistUrl: string): Promise<Track[]> {
  const playlistId = extractPlaylistId(playlistUrl)
  const token = await getAccessToken()
  const tracks: Track[] = []

  let url: string | null =
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks` +
    `?limit=100&fields=next,items(track(name,artists(name),album(release_date),preview_url))`

  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`Spotify playlist fetch failed: ${res.status}`)
    const data = await res.json()

    for (const item of data.items) {
      const track = buildTrackFromSpotify(item)
      if (track) tracks.push(track)
    }

    url = data.next ?? null
  }

  return tracks
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- __tests__/spotify.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/spotify.ts __tests__/spotify.test.ts
git commit -m "feat: add Spotify playlist client with tests"
```

---

## Task 5: Redis Helpers

**Files:**
- Create: `lib/redis.ts`

- [ ] **Step 1: Write `lib/redis.ts`**

```typescript
import { Redis } from '@upstash/redis'
import type { GameState } from './types'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const GAME_TTL_SECONDS = 14400 // 4 hours

export async function getGame(roomCode: string): Promise<GameState | null> {
  return redis.get<GameState>(`game:${roomCode}`)
}

export async function saveGame(state: GameState): Promise<void> {
  await redis.set(`game:${state.roomCode}`, state, { ex: GAME_TTL_SECONDS })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/redis.ts
git commit -m "feat: add Upstash Redis game state helpers"
```

---

## Task 6: Pusher Setup

**Files:**
- Create: `lib/pusher.ts`, `lib/pusher-client.ts`

- [ ] **Step 1: Write `lib/pusher.ts` (server-side singleton)**

```typescript
import Pusher from 'pusher'

export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
})
```

- [ ] **Step 2: Write `lib/pusher-client.ts` (browser singleton)**

```typescript
import PusherJS from 'pusher-js'

let instance: PusherJS | null = null

export function getPusherClient(): PusherJS {
  if (!instance) {
    instance = new PusherJS(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })
  }
  return instance
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add lib/pusher.ts lib/pusher-client.ts
git commit -m "feat: add Pusher server and client singletons"
```

---

## Task 7: Create Game API

**Files:**
- Create: `app/api/games/route.ts`, `__tests__/api-create.test.ts`

- [ ] **Step 1: Write failing tests in `__tests__/api-create.test.ts`**

```typescript
import { POST } from '@/app/api/games/route'

jest.mock('@/lib/spotify', () => ({
  fetchPlaylistTracks: jest.fn().mockResolvedValue([
    { title: 'Song A', artist: 'Artist A', year: 1985, previewUrl: 'https://preview/a' },
    { title: 'Song B', artist: 'Artist B', year: 1992, previewUrl: 'https://preview/b' },
    { title: 'Song C', artist: 'Artist C', year: 2001, previewUrl: 'https://preview/c' },
    { title: 'Song D', artist: 'Artist D', year: 2010, previewUrl: 'https://preview/d' },
    { title: 'Song E', artist: 'Artist E', year: 2018, previewUrl: 'https://preview/e' },
  ]),
}))

jest.mock('@/lib/redis', () => ({
  saveGame: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/pusher', () => ({
  pusher: { trigger: jest.fn().mockResolvedValue(undefined) },
}))

function makeRequest(body: object) {
  return new Request('http://localhost/api/games', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/games', () => {
  it('returns a roomCode and playerId', async () => {
    const res = await POST(makeRequest({
      playlistUrl: 'https://open.spotify.com/playlist/abc',
      gameLength: 5,
      tokensEnabled: false,
      hostName: 'Alice',
    }))
    const data = await res.json()
    expect(data.roomCode).toMatch(/^[A-Z0-9]{6}$/)
    expect(typeof data.playerId).toBe('string')
    expect(res.status).toBe(200)
  })

  it('returns 400 when hostName is missing', async () => {
    const res = await POST(makeRequest({
      playlistUrl: 'https://open.spotify.com/playlist/abc',
      gameLength: 5,
      tokensEnabled: false,
    }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when playlistUrl is missing', async () => {
    const res = await POST(makeRequest({ gameLength: 5, tokensEnabled: false, hostName: 'Alice' }))
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- __tests__/api-create.test.ts
```

Expected: Fails with "Cannot find module '@/app/api/games/route'".

- [ ] **Step 3: Write `app/api/games/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { fetchPlaylistTracks } from '@/lib/spotify'
import { saveGame } from '@/lib/redis'
import { generateRoomCode, shuffle } from '@/lib/game-logic'
import type { GameState, Player } from '@/lib/types'

export async function POST(request: Request) {
  const body = await request.json()
  const { playlistUrl, gameLength, tokensEnabled, hostName } = body

  if (!playlistUrl || !hostName || !gameLength) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  let tracks
  try {
    tracks = await fetchPlaylistTracks(playlistUrl)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch playlist. Is the URL correct and the playlist public?' }, { status: 400 })
  }

  if (tracks.length < gameLength) {
    return NextResponse.json(
      { error: `Playlist only has ${tracks.length} tracks with previews. Need at least ${gameLength}.` },
      { status: 400 }
    )
  }

  const roomCode = generateRoomCode()
  const hostId = crypto.randomUUID()

  const host: Player = { id: hostId, name: hostName, timeline: [], tokens: 0 }

  const state: GameState = {
    roomCode,
    phase: 'lobby',
    settings: { gameLength, tokensEnabled },
    hostId,
    players: [host],
    queue: shuffle(tracks),
    currentTrack: null,
    activePlayerIndex: 0,
    turnPhase: 'listening',
    pendingGuess: null,
    pendingChallenge: null,
    winnerId: null,
  }

  await saveGame(state)

  return NextResponse.json({ roomCode, playerId: hostId })
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- __tests__/api-create.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/api/games/route.ts __tests__/api-create.test.ts
git commit -m "feat: add create game API route"
```

---

## Task 8: Join, Start, and State API Routes

**Files:**
- Create: `app/api/games/[code]/route.ts`, `app/api/games/[code]/join/route.ts`, `app/api/games/[code]/start/route.ts`

- [ ] **Step 1: Write `app/api/games/[code]/route.ts` (GET — reconnect/initial state)**

```typescript
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
```

- [ ] **Step 2: Write `app/api/games/[code]/join/route.ts`**

```typescript
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
    players: state.players.map(p => ({ id: p.id, name: p.name, cardCount: 0, tokens: 0 })),
  })

  return NextResponse.json({ playerId })
}
```

- [ ] **Step 3: Write `app/api/games/[code]/start/route.ts`**

```typescript
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
  if (state.hostId !== playerId) return NextResponse.json({ error: 'Only the host can start the game' }, { status: 403 })
  if (state.phase !== 'lobby') return NextResponse.json({ error: 'Game already started' }, { status: 400 })
  if (state.players.length < 2) return NextResponse.json({ error: 'Need at least 2 players to start' }, { status: 400 })

  const firstTrack = state.queue.shift()!
  state.phase = 'playing'
  state.currentTrack = firstTrack
  state.turnPhase = 'listening'
  state.activePlayerIndex = 0

  await saveGame(state)

  await pusher.trigger(`game-${params.code}`, 'game-started', {
    settings: state.settings,
    players: state.players.map(p => ({ id: p.id, name: p.name, cardCount: 0, tokens: 0 })),
    activePlayerId: state.players[0].id,
  })

  await pusher.trigger(`game-${params.code}`, 'turn-started', {
    activePlayerId: state.players[0].id,
    previewUrl: firstTrack.previewUrl,
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/games/[code]/
git commit -m "feat: add join, start, and state API routes"
```

---

## Task 9: Guess and HITSTER API Routes

**Files:**
- Create: `app/api/games/[code]/guess/route.ts`, `app/api/games/[code]/hitster/route.ts`

- [ ] **Step 1: Write `app/api/games/[code]/guess/route.ts`**

The guess endpoint is called by the active player during `listening` phase. It optionally stores a title+artist guess and always advances the turn phase to `placing`.

```typescript
import { NextResponse } from 'next/server'
import { getGame, saveGame } from '@/lib/redis'
import { pusher } from '@/lib/pusher'

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  const { playerId, title, artist } = await request.json()
  const state = await getGame(params.code)

  if (!state) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (state.phase !== 'playing') return NextResponse.json({ error: 'Game not in progress' }, { status: 400 })
  if (state.players[state.activePlayerIndex].id !== playerId) {
    return NextResponse.json({ error: 'Not your turn' }, { status: 403 })
  }
  if (state.turnPhase !== 'listening') {
    return NextResponse.json({ error: 'Not in listening phase' }, { status: 400 })
  }

  state.pendingGuess = (title && artist)
    ? { playerId, title: title.trim(), artist: artist.trim() }
    : null
  state.turnPhase = 'placing'

  await saveGame(state)

  await pusher.trigger(`game-${params.code}`, 'guess-submitted', {
    activePlayerId: playerId,
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Write `app/api/games/[code]/hitster/route.ts`**

Non-active players spend a token to challenge the active player's placement. First call wins; subsequent calls during the same turn are rejected (token not spent).

```typescript
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
  if (state.turnPhase !== 'placing') return NextResponse.json({ error: 'Not in placing phase' }, { status: 400 })
  if (!state.settings.tokensEnabled) return NextResponse.json({ error: 'Tokens are disabled' }, { status: 400 })

  const activePlayer = state.players[state.activePlayerIndex]
  if (activePlayer.id === playerId) return NextResponse.json({ error: 'Cannot challenge your own placement' }, { status: 400 })

  if (state.pendingChallenge) {
    return NextResponse.json({ error: 'Someone already called HITSTER this turn' }, { status: 409 })
  }

  const challenger = state.players.find(p => p.id === playerId)
  if (!challenger) return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  if (challenger.tokens < 1) return NextResponse.json({ error: 'Not enough tokens' }, { status: 400 })

  // Spend the token immediately
  challenger.tokens -= 1
  state.pendingChallenge = { challengerId: playerId }

  await saveGame(state)

  await pusher.trigger(`game-${params.code}`, 'hitster-called', {
    challengerId: playerId,
    challengerName: challenger.name,
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/games/[code]/guess/ app/api/games/[code]/hitster/
git commit -m "feat: add guess and HITSTER API routes"
```

---

## Task 10: Place Card API (Core Turn Resolution)

**Files:**
- Create: `app/api/games/[code]/place/route.ts`, `__tests__/api-place.test.ts`

- [ ] **Step 1: Write failing tests in `__tests__/api-place.test.ts`**

```typescript
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
      pendingChallenge: { challengerId: 'p2' },
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
      pendingChallenge: { challengerId: 'p2' },
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
      settings: { gameLength: 2, tokensEnabled: false },
      players: [
        { id: 'p1', name: 'Alice', timeline: [{ title: 'X', artist: 'Y', year: 1980 }], tokens: 0 },
        { id: 'p2', name: 'Bob', timeline: [], tokens: 0 },
      ],
    })
    getGame.mockResolvedValue(state)
    await POST(makeRequest('ABC123', { playerId: 'p1', position: 1 }), { params: { code: 'ABC123' } })
    const saved: GameState = mockSave.mock.calls[0][0]
    expect(saved.phase).toBe('finished')
    expect(mockTrigger).toHaveBeenCalledWith('game-ABC123', 'game-ended', expect.objectContaining({
      winnerId: 'p1',
    }))
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- __tests__/api-place.test.ts
```

Expected: Fails with "Cannot find module '@/app/api/games/[code]/place/route'".

- [ ] **Step 3: Write `app/api/games/[code]/place/route.ts`**

```typescript
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
  const challengeIncorrect = challenge !== null && placementCorrect

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

  // If HITSTER was incorrect, token was already spent — no further action needed

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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- __tests__/api-place.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/api/games/[code]/place/ __tests__/api-place.test.ts
git commit -m "feat: add place card API route with full turn resolution logic"
```

---

## Task 11: Next Turn API

**Files:**
- Create: `app/api/games/[code]/next/route.ts`

- [ ] **Step 1: Write `app/api/games/[code]/next/route.ts`**

```typescript
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

  const activePlayer = state.players[state.activePlayerIndex]
  if (activePlayer.id !== playerId) return NextResponse.json({ error: 'Not your turn' }, { status: 403 })
  if (state.turnPhase !== 'revealing') return NextResponse.json({ error: 'Not in revealing phase' }, { status: 400 })

  if (state.queue.length === 0) {
    state.phase = 'finished'
    await saveGame(state)
    await pusher.trigger(`game-${params.code}`, 'game-ended', {
      winnerId: null,
      winnerName: null,
    })
    return NextResponse.json({ ok: true })
  }

  state.activePlayerIndex = (state.activePlayerIndex + 1) % state.players.length
  const nextTrack = state.queue.shift()!
  state.currentTrack = nextTrack
  state.turnPhase = 'listening'

  await saveGame(state)

  await pusher.trigger(`game-${params.code}`, 'turn-started', {
    activePlayerId: state.players[state.activePlayerIndex].id,
    previewUrl: nextTrack.previewUrl,
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Verify TypeScript and run all tests**

```bash
npx tsc --noEmit && npm test
```

Expected: No TypeScript errors, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/api/games/[code]/next/
git commit -m "feat: add next turn API route"
```

---

## Task 12: useGameRoom Hook

**Files:**
- Create: `hooks/useGameRoom.ts`

- [ ] **Step 1: Write `hooks/useGameRoom.ts`**

This hook subscribes to Pusher, maintains client-side game state, and exposes action helpers that call the API routes.

```typescript
'use client'
import { useEffect, useState, useCallback } from 'react'
import { getPusherClient } from '@/lib/pusher-client'
import { insertCardSorted } from '@/lib/game-logic'
import type {
  ClientGameState,
  GameSettings,
  TurnResultPayload,
  PlayerSummary,
  Card,
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
  }
}

export function useGameRoom(roomCode: string, playerId: string) {
  const [gameState, setGameState] = useState<ClientGameState>(initialState)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load initial state from server
  useEffect(() => {
    if (!roomCode || !playerId) return
    fetch(`/api/games/${roomCode}?playerId=${playerId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
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
      }))
    })

    channel.bind('guess-submitted', () => {
      setGameState(prev => ({ ...prev, turnPhase: 'placing' }))
    })

    channel.bind('hitster-called', (data: { challengerName: string }) => {
      setGameState(prev => ({ ...prev, pendingChallengerName: data.challengerName }))
    })

    channel.bind('turn-result', (data: TurnResultPayload) => {
      setGameState(prev => {
        const newCard: Card = { title: data.title, artist: data.artist, year: data.year }
        let myTimeline = prev.myTimeline
        let myTokens = prev.myTokens

        const iAmActivePlayer = prev.activePlayerId === playerId
        const iAmChallenger = data.challengerId === playerId

        if (iAmActivePlayer && data.placementCorrect && data.challengeResult !== 'correct') {
          myTimeline = insertCardSorted(myTimeline, newCard)
        } else if (iAmChallenger && data.challengeResult === 'correct') {
          myTimeline = insertCardSorted(myTimeline, newCard)
        }

        if (iAmActivePlayer && data.guessCorrect) {
          myTokens = Math.min(5, myTokens + 1)
        }
        if (iAmChallenger) {
          // Token was already spent on HITSTER call — sync from server
          const me = data.players.find(p => p.id === playerId)
          if (me) myTokens = me.tokens
        }

        return {
          ...prev,
          turnPhase: 'revealing',
          lastResult: data,
          players: data.players,
          myTimeline,
          myTokens,
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
    callHitster: () => post('hitster', {}),
    nextTurn: () => post('next', {}),
  }

  return { gameState, connected, error, actions }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add hooks/useGameRoom.ts
git commit -m "feat: add useGameRoom Pusher hook with action helpers"
```

---

## Task 13: Home, Create, and Join Pages

**Files:**
- Create: `app/page.tsx`, `app/create/page.tsx`, `app/join/page.tsx`

- [ ] **Step 1: Write `app/page.tsx`**

```tsx
import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <h1 className="text-5xl font-bold tracking-tight">Hitster Plus</h1>
      <p className="text-gray-400 text-lg">Play Hitster with friends using your Spotify playlist</p>
      <div className="flex flex-col sm:flex-row gap-4 mt-4">
        <Link
          href="/create"
          className="px-8 py-4 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl text-xl transition"
        >
          Create Game
        </Link>
        <Link
          href="/join"
          className="px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl text-xl transition"
        >
          Join Game
        </Link>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Write `app/create/page.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreatePage() {
  const router = useRouter()
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [hostName, setHostName] = useState('')
  const [gameLength, setGameLength] = useState<5 | 10>(10)
  const [tokensEnabled, setTokensEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistUrl, hostName, gameLength, tokensEnabled }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setLoading(false); return }
      localStorage.setItem(`hitster_player_${data.roomCode}`, data.playerId)
      router.push(`/room/${data.roomCode}`)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-8">Create a Game</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Your name</label>
            <input
              className="w-full bg-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              value={hostName}
              onChange={e => setHostName(e.target.value)}
              placeholder="Enter your name"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Spotify playlist URL</label>
            <input
              className="w-full bg-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              value={playlistUrl}
              onChange={e => setPlaylistUrl(e.target.value)}
              placeholder="https://open.spotify.com/playlist/..."
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Game length</label>
            <div className="flex gap-3">
              {([5, 10] as const).map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setGameLength(n)}
                  className={`flex-1 py-3 rounded-lg font-semibold transition ${
                    gameLength === n
                      ? 'bg-green-500 text-black'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  {n === 5 ? 'Short (5 cards)' : 'Long (10 cards)'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
            <span className="text-sm">Enable token system</span>
            <button
              type="button"
              onClick={() => setTokensEnabled(t => !t)}
              className={`w-12 h-6 rounded-full transition ${tokensEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
            >
              <span className={`block w-5 h-5 bg-white rounded-full transition transform ${tokensEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="py-4 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl text-lg transition disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Game'}
          </button>
        </form>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Write `app/join/page.tsx`**

```tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function JoinForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [code, setCode] = useState(searchParams.get('code') ?? '')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/games/${code.toUpperCase()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setLoading(false); return }
      localStorage.setItem(`hitster_player_${code.toUpperCase()}`, data.playerId)
      router.push(`/room/${code.toUpperCase()}`)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold mb-8">Join a Game</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Room code</label>
            <input
              className="w-full bg-gray-800 rounded-lg px-4 py-3 text-white uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Your name</label>
            <input
              className="w-full bg-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your name"
              required
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="py-4 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl text-lg transition disabled:opacity-50"
          >
            {loading ? 'Joining...' : 'Join Game'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinForm />
    </Suspense>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx app/create/ app/join/
git commit -m "feat: add home, create, and join pages"
```

---

## Task 14: Lobby View

**Files:**
- Create: `components/LobbyView.tsx`

- [ ] **Step 1: Write `components/LobbyView.tsx`**

```tsx
'use client'
import { useState } from 'react'
import type { PlayerSummary, GameSettings } from '@/lib/types'

interface LobbyViewProps {
  roomCode: string
  players: PlayerSummary[]
  settings: GameSettings
  isHost: boolean
  onStart: () => void
}

export function LobbyView({ roomCode, players, settings, isHost, onStart }: LobbyViewProps) {
  const [copied, setCopied] = useState(false)
  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/join?code=${roomCode}`
    : ''

  function copyLink() {
    navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-6">
      <h1 className="text-3xl font-bold">Waiting for players...</h1>

      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm text-center">
        <p className="text-gray-400 text-sm mb-1">Room code</p>
        <p className="text-5xl font-mono font-bold tracking-widest text-green-400">{roomCode}</p>
        <button
          onClick={copyLink}
          className="mt-4 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition"
        >
          {copied ? 'Copied!' : 'Copy invite link'}
        </button>
      </div>

      <div className="w-full max-w-sm">
        <p className="text-gray-400 text-sm mb-2">{players.length} player{players.length !== 1 ? 's' : ''} in lobby</p>
        <ul className="flex flex-col gap-2">
          {players.map(p => (
            <li key={p.id} className="bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              {p.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="text-sm text-gray-500">
        {settings.gameLength} cards to win &bull; Tokens {settings.tokensEnabled ? 'on' : 'off'}
      </div>

      {isHost && (
        <button
          onClick={onStart}
          disabled={players.length < 2}
          className="px-10 py-4 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl text-lg transition disabled:opacity-40"
        >
          {players.length < 2 ? 'Waiting for more players...' : 'Start Game'}
        </button>
      )}
      {!isHost && (
        <p className="text-gray-400">Waiting for the host to start...</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/LobbyView.tsx
git commit -m "feat: add LobbyView component"
```

---

## Task 15: AudioPlayer Component

**Files:**
- Create: `components/AudioPlayer.tsx`

- [ ] **Step 1: Write `components/AudioPlayer.tsx`**

Plays a 30-second preview URL via HTML5 Audio. Auto-plays when the URL changes. Shows a waveform-style visual and playback controls.

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'

interface AudioPlayerProps {
  previewUrl: string | null
}

export function AudioPlayer({ previewUrl }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!audioRef.current || !previewUrl) return
    audioRef.current.src = previewUrl
    audioRef.current.play().catch(() => {})
  }, [previewUrl])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => { setPlaying(false); setProgress(0) }
    const onTimeUpdate = () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration)
    }

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('timeupdate', onTimeUpdate)

    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('timeupdate', onTimeUpdate)
    }
  }, [])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    playing ? audio.pause() : audio.play().catch(() => {})
  }

  if (!previewUrl) {
    return (
      <div className="bg-gray-800 rounded-2xl p-6 flex items-center justify-center h-24">
        <p className="text-gray-500">Waiting for song...</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-6 flex flex-col gap-3">
      <audio ref={audioRef} />
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="w-12 h-12 bg-green-500 hover:bg-green-400 rounded-full flex items-center justify-center text-black font-bold text-xl transition flex-shrink-0"
        >
          {playing ? '⏸' : '▶'}
        </button>
        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-400 transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
      <p className="text-center text-gray-400 text-sm">
        {playing ? 'Playing...' : 'Paused'} — what year is this song?
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/AudioPlayer.tsx
git commit -m "feat: add AudioPlayer component"
```

---

## Task 16: Timeline Component

**Files:**
- Create: `components/Timeline.tsx`

- [ ] **Step 1: Write `components/Timeline.tsx`**

Displays the player's timeline of cards. Shows clickable slots between cards for placement. Selected slot highlighted; "Place here" button submits the placement.

```tsx
'use client'
import { useState } from 'react'
import type { Card } from '@/lib/types'

interface TimelineProps {
  timeline: Card[]
  isActivePlayer: boolean
  onPlace: (position: number) => void
  disabled?: boolean
}

export function Timeline({ timeline, isActivePlayer, onPlace, disabled = false }: TimelineProps) {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)

  function handlePlace() {
    if (selectedSlot === null) return
    onPlace(selectedSlot)
    setSelectedSlot(null)
  }

  const slotCount = timeline.length + 1

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm text-gray-400 uppercase tracking-wider">Your Timeline</h2>

      {timeline.length === 0 && !isActivePlayer && (
        <p className="text-gray-600 text-sm italic">No cards yet</p>
      )}

      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {Array.from({ length: slotCount }, (_, slotIndex) => (
          <div key={slotIndex} className="flex items-center gap-1 flex-shrink-0">
            {isActivePlayer && !disabled && (
              <button
                onClick={() => setSelectedSlot(slotIndex === selectedSlot ? null : slotIndex)}
                className={`w-6 h-16 rounded flex items-center justify-center transition border-2 ${
                  selectedSlot === slotIndex
                    ? 'border-green-400 bg-green-400/20'
                    : 'border-dashed border-gray-600 hover:border-gray-400'
                }`}
                title={`Place ${slotIndex === 0 ? 'before all' : slotIndex === timeline.length ? 'after all' : `between card ${slotIndex} and ${slotIndex + 1}`}`}
              >
                {selectedSlot === slotIndex && (
                  <span className="text-green-400 text-xs">▼</span>
                )}
              </button>
            )}

            {slotIndex < timeline.length && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-center min-w-[80px]">
                <p className="text-green-400 font-bold text-lg">{timeline[slotIndex].year}</p>
                <p className="text-xs text-gray-400 truncate max-w-[70px]">{timeline[slotIndex].title}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {isActivePlayer && selectedSlot !== null && (
        <button
          onClick={handlePlace}
          disabled={disabled}
          className="py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition disabled:opacity-50"
        >
          Place here (slot {selectedSlot + 1})
        </button>
      )}

      {isActivePlayer && selectedSlot === null && !disabled && (
        <p className="text-gray-500 text-sm text-center">
          {timeline.length === 0
            ? 'Click the slot to place your first card'
            : 'Click a slot between cards to place'}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/Timeline.tsx
git commit -m "feat: add Timeline component with slot-based card placement"
```

---

## Task 17: GuessForm and TokenControls

**Files:**
- Create: `components/GuessForm.tsx`, `components/TokenControls.tsx`

- [ ] **Step 1: Write `components/GuessForm.tsx`**

Shown to the active player during the `listening` phase. They can optionally guess title + artist to earn a token.

```tsx
'use client'
import { useState } from 'react'

interface GuessFormProps {
  onSubmit: (title: string, artist: string) => void
  onSkip: () => void
  disabled?: boolean
}

export function GuessForm({ onSubmit, onSkip, disabled = false }: GuessFormProps) {
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !artist.trim()) return
    onSubmit(title.trim(), artist.trim())
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-5 flex flex-col gap-4">
      <div>
        <p className="font-semibold">Can you name this song?</p>
        <p className="text-sm text-gray-400">Correct guess earns +1 token</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          className="bg-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Song title"
          disabled={disabled}
        />
        <input
          className="bg-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          value={artist}
          onChange={e => setArtist(e.target.value)}
          placeholder="Artist"
          disabled={disabled}
        />
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={disabled || !title.trim() || !artist.trim()}
            className="flex-1 py-2 bg-green-500 hover:bg-green-400 text-black font-bold rounded-lg transition disabled:opacity-50"
          >
            Guess
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={disabled}
            className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition disabled:opacity-50"
          >
            Skip
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Write `components/TokenControls.tsx`**

Shown to non-active players when tokens are enabled during the `placing` phase.

```tsx
'use client'

interface TokenControlsProps {
  tokens: number
  canCallHitster: boolean
  onCallHitster: () => void
  challengerName?: string | null
}

export function TokenControls({ tokens, canCallHitster, onCallHitster, challengerName }: TokenControlsProps) {
  return (
    <div className="bg-gray-800 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Your tokens</span>
        <span className="font-bold text-yellow-400">{tokens} 🪙</span>
      </div>

      {challengerName ? (
        <p className="text-center text-yellow-400 font-semibold py-2">
          {challengerName} called HITSTER!
        </p>
      ) : canCallHitster ? (
        <button
          onClick={onCallHitster}
          className="py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition"
        >
          Call HITSTER! (spend 1 token)
        </button>
      ) : (
        <p className="text-center text-gray-500 text-sm py-1">
          {tokens === 0 ? 'No tokens to challenge with' : 'Waiting for active player...'}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/GuessForm.tsx components/TokenControls.tsx
git commit -m "feat: add GuessForm and TokenControls components"
```

---

## Task 18: GameView, ResultOverlay, WinScreen

**Files:**
- Create: `components/GameView.tsx`, `components/ResultOverlay.tsx`, `components/WinScreen.tsx`

- [ ] **Step 1: Write `components/ResultOverlay.tsx`**

Full-screen overlay shown after each turn. Reveals title, artist, year and all outcomes.

```tsx
'use client'
import type { TurnResultPayload, PlayerSummary } from '@/lib/types'

interface ResultOverlayProps {
  result: TurnResultPayload
  activePlayerName: string
  myPlayerId: string
  isActivePlayer: boolean
  onNext: () => void
}

export function ResultOverlay({ result, activePlayerName, myPlayerId, isActivePlayer, onNext }: ResultOverlayProps) {
  const { title, artist, year, placementCorrect, guessCorrect, challengeResult, challengerId, players } = result

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-3xl p-8 max-w-sm w-full flex flex-col gap-5">
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-1">The song was</p>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-gray-300">{artist}</p>
          <p className="text-4xl font-bold text-green-400 mt-2">{year}</p>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${placementCorrect ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
            <span>{placementCorrect ? '✓' : '✗'}</span>
            <span>{activePlayerName}'s placement was {placementCorrect ? 'correct' : 'incorrect'}</span>
          </div>

          {guessCorrect && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-900/40 text-yellow-400">
              <span>🪙</span>
              <span>{activePlayerName} named the song! +1 token</span>
            </div>
          )}

          {challengeResult === 'correct' && challengerId && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-900/40 text-yellow-400">
              <span>🎯</span>
              <span>HITSTER was correct! {players.find(p => p.id === challengerId)?.name} claims the card</span>
            </div>
          )}
          {challengeResult === 'incorrect' && challengerId && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-900/40 text-red-400">
              <span>✗</span>
              <span>HITSTER was wrong — {players.find(p => p.id === challengerId)?.name} loses a token</span>
            </div>
          )}
        </div>

        <div className="border-t border-gray-700 pt-3">
          <p className="text-xs text-gray-500 mb-2">Standings</p>
          <div className="flex flex-col gap-1">
            {[...players].sort((a, b) => b.cardCount - a.cardCount).map(p => (
              <div key={p.id} className="flex justify-between text-sm">
                <span className={p.id === myPlayerId ? 'text-green-400 font-semibold' : 'text-gray-300'}>
                  {p.name}
                </span>
                <span className="text-gray-400">{p.cardCount} cards{p.tokens > 0 ? ` · ${p.tokens}🪙` : ''}</span>
              </div>
            ))}
          </div>
        </div>

        {isActivePlayer && (
          <button
            onClick={onNext}
            className="py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition"
          >
            Next turn
          </button>
        )}
        {!isActivePlayer && (
          <p className="text-center text-gray-500 text-sm">Waiting for {activePlayerName} to continue...</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `components/WinScreen.tsx`**

```tsx
'use client'
import { useRouter } from 'next/navigation'

interface WinScreenProps {
  winnerId: string | null
  winnerName: string | null
  myPlayerId: string
}

export function WinScreen({ winnerId, winnerName, myPlayerId }: WinScreenProps) {
  const router = useRouter()
  const iWon = winnerId === myPlayerId

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-6 text-center">
      <div className="text-7xl">{iWon ? '🏆' : '🎵'}</div>
      <h1 className="text-4xl font-bold">
        {winnerId === null ? 'Game Over!' : iWon ? 'You win!' : `${winnerName} wins!`}
      </h1>
      {winnerId === null && (
        <p className="text-gray-400">The playlist ran out of songs.</p>
      )}
      {!iWon && winnerId && (
        <p className="text-gray-400">Better luck next time!</p>
      )}
      <button
        onClick={() => router.push('/')}
        className="px-8 py-4 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl text-lg transition"
      >
        Back to Home
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Write `components/GameView.tsx`**

Assembles AudioPlayer, Timeline, GuessForm, and TokenControls for the active game phase.

```tsx
'use client'
import { AudioPlayer } from './AudioPlayer'
import { Timeline } from './Timeline'
import { GuessForm } from './GuessForm'
import { TokenControls } from './TokenControls'
import { ResultOverlay } from './ResultOverlay'
import type { ClientGameState, PlayerSummary } from '@/lib/types'

interface GameViewProps {
  gameState: ClientGameState
  myPlayerId: string
  actions: {
    submitGuess: (title: string, artist: string) => Promise<unknown>
    skipGuess: () => Promise<unknown>
    placeCard: (position: number) => Promise<unknown>
    callHitster: () => Promise<unknown>
    nextTurn: () => Promise<unknown>
  }
}

export function GameView({ gameState, myPlayerId, actions }: GameViewProps) {
  const { players, activePlayerId, previewUrl, turnPhase, lastResult, settings, myTimeline, myTokens, pendingChallengerName } = gameState
  const isActivePlayer = activePlayerId === myPlayerId
  const activePlayer = players.find(p => p.id === activePlayerId)

  return (
    <div className="flex flex-col min-h-screen p-4 gap-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {isActivePlayer ? 'Your turn' : `${activePlayer?.name ?? ''}'s turn`}
        </p>
        <div className="flex gap-2">
          {players.map(p => (
            <div
              key={p.id}
              className={`text-xs px-2 py-1 rounded-full ${p.id === activePlayerId ? 'bg-green-500 text-black font-bold' : 'bg-gray-700 text-gray-300'}`}
            >
              {p.name}: {p.cardCount}
            </div>
          ))}
        </div>
      </div>

      <AudioPlayer previewUrl={previewUrl} />

      {isActivePlayer && turnPhase === 'listening' && (
        <GuessForm
          onSubmit={actions.submitGuess}
          onSkip={actions.skipGuess}
        />
      )}

      {!isActivePlayer && turnPhase === 'listening' && (
        <div className="bg-gray-800 rounded-2xl p-4 text-center text-gray-400 text-sm">
          {activePlayer?.name} is deciding whether to guess the song...
        </div>
      )}

      <Timeline
        timeline={myTimeline}
        isActivePlayer={isActivePlayer && turnPhase === 'placing'}
        onPlace={actions.placeCard}
        disabled={turnPhase !== 'placing'}
      />

      {!isActivePlayer && turnPhase === 'placing' && settings.tokensEnabled && (
        <TokenControls
          tokens={myTokens}
          canCallHitster={myTokens > 0 && pendingChallengerName === null}
          onCallHitster={actions.callHitster}
          challengerName={pendingChallengerName}
        />
      )}

      {isActivePlayer && turnPhase === 'placing' && (
        <div className="bg-gray-800 rounded-2xl p-4 text-center text-gray-400 text-sm">
          Pick a slot on your timeline to place the card
        </div>
      )}

      {lastResult && turnPhase === 'revealing' && (
        <ResultOverlay
          result={lastResult}
          activePlayerName={activePlayer?.name ?? ''}
          myPlayerId={myPlayerId}
          isActivePlayer={isActivePlayer}
          onNext={actions.nextTurn}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/GameView.tsx components/ResultOverlay.tsx components/WinScreen.tsx
git commit -m "feat: add GameView, ResultOverlay, and WinScreen components"
```

---

## Task 19: Room Page (Assembles Everything)

**Files:**
- Create: `app/room/[code]/page.tsx`

- [ ] **Step 1: Write `app/room/[code]/page.tsx`**

This is the main entry point for the game. Reads the player ID from localStorage, connects to Pusher, and renders the correct view based on game phase.

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useGameRoom } from '@/hooks/useGameRoom'
import { LobbyView } from '@/components/LobbyView'
import { GameView } from '@/components/GameView'
import { WinScreen } from '@/components/WinScreen'

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const code = (params.code as string).toUpperCase()

  const [playerId, setPlayerId] = useState<string | null>(null)
  const [hostId, setHostId] = useState<string | null>(null)

  useEffect(() => {
    const storedId = localStorage.getItem(`hitster_player_${code}`)
    if (!storedId) {
      router.replace(`/join?code=${code}`)
      return
    }
    setPlayerId(storedId)

    // Fetch hostId from game state (GET returns hostId)
    fetch(`/api/games/${code}?playerId=${storedId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { router.replace('/'); return }
        setHostId(data.hostId)
      })
  }, [code, router])

  const { gameState, connected, error, actions } = useGameRoom(
    playerId ? code : '',
    playerId ?? ''
  )

  if (!playerId) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        Redirecting...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
        <p className="text-red-400 text-lg">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition"
        >
          Back to Home
        </button>
      </div>
    )
  }

  if (!connected || gameState.players.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        Connecting...
      </div>
    )
  }

  if (gameState.phase === 'lobby') {
    return (
      <LobbyView
        roomCode={code}
        players={gameState.players}
        settings={gameState.settings}
        isHost={playerId === hostId}
        onStart={actions.start}
      />
    )
  }

  if (gameState.phase === 'finished') {
    return (
      <WinScreen
        winnerId={gameState.winnerId}
        winnerName={gameState.winnerName}
        myPlayerId={playerId}
      />
    )
  }

  return (
    <GameView
      gameState={gameState}
      myPlayerId={playerId}
      actions={actions}
    />
  )
}
```

- [ ] **Step 2: Add `hostId` to GET /api/games/[code] response**

Open `app/api/games/[code]/route.ts` and confirm the response already includes `hostId: state.hostId`. It does — no change needed.

- [ ] **Step 3: Run a full build**

```bash
npm run build
```

Expected: Build succeeds. Fix any TypeScript errors before continuing.

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/room/
git commit -m "feat: add room page — assembles lobby, game, and win views"
```

---

## Task 20: Deployment Config and External Services Setup

**Files:**
- Modify: `.env.example`
- Create: `.env.local` (do not commit)

- [ ] **Step 1: Set up Spotify app credentials**

1. Go to https://developer.spotify.com/dashboard
2. Create a new app (any name, redirect URI not needed for Client Credentials)
3. Copy Client ID and Client Secret

- [ ] **Step 2: Set up Pusher**

1. Go to https://pusher.com — create a free account
2. Create a new Channels app (select your closest cluster, e.g. `eu`)
3. Copy App ID, Key, Secret, Cluster

- [ ] **Step 3: Set up Upstash Redis**

1. Go to https://console.upstash.com — create a free account
2. Create a new Redis database (select your closest region)
3. Copy REST URL and REST Token

- [ ] **Step 4: Write `.env.local`**

```
SPOTIFY_CLIENT_ID=<from step 1>
SPOTIFY_CLIENT_SECRET=<from step 1>

PUSHER_APP_ID=<from step 2>
PUSHER_KEY=<from step 2>
PUSHER_SECRET=<from step 2>
PUSHER_CLUSTER=eu

NEXT_PUBLIC_PUSHER_KEY=<from step 2, same as PUSHER_KEY>
NEXT_PUBLIC_PUSHER_CLUSTER=eu

UPSTASH_REDIS_REST_URL=<from step 3>
UPSTASH_REDIS_REST_TOKEN=<from step 3>
```

- [ ] **Step 5: Verify app runs locally**

```bash
npm run dev
```

Open http://localhost:3000. You should see the home page. Create a game with a real Spotify playlist URL to verify the full flow.

- [ ] **Step 6: Deploy to Vercel**

```bash
npx vercel
```

When prompted: link to new project, set framework to Next.js. After deploy, go to the Vercel dashboard and add all environment variables from `.env.local` under Settings → Environment Variables.

- [ ] **Step 7: Final commit**

```bash
git add .env.example
git commit -m "feat: complete Hitster Plus implementation"
```
