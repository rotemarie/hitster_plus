# Hitster Plus — Design Spec

**Date:** 2026-06-08
**Status:** Approved

---

## Overview

Hitster Plus is a web-based multiplayer version of the Hitster card game. Players compete to build a correct chronological timeline of songs. Instead of physical QR cards, the game draws from a Spotify playlist provided at room creation. Each player connects from their own device over the internet in real time.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend + API routes | Next.js (App Router) + Tailwind CSS |
| Real-time events | Pusher (WebSocket channels) |
| Game state persistence | Upstash Redis (serverless key/value, free tier) |
| Music source | Spotify Web API — playlist fetch + 30-second preview MP3 URLs |
| Deployment | Vercel |

**Why Upstash Redis:** Vercel serverless functions are stateless. Game state is stored as a JSON blob keyed by room code with a 4-hour TTL, so rooms auto-expire.

**Why Spotify previews (no OAuth):** Spotify provides a `preview_url` (30-sec MP3) per track accessible via Client Credentials (app-level auth only). No player needs a Spotify account. Tracks missing a `preview_url` are filtered out at room creation.

---

## Architecture

```
Browser (all players)
    ↕ HTTP          ↕ Pusher WebSocket
Next.js API routes
    ↕ Redis              ↕ Pusher server SDK
Upstash Redis       Pusher
    ↑
Spotify Web API (playlist fetch at room creation only)
```

- All game logic runs server-side in API routes.
- Clients never receive the song queue, title, artist, or year until the server reveals them.
- Clients send actions to API routes; the server validates, updates Redis, and fires Pusher events.

---

## Pages

| Route | Purpose |
|---|---|
| `/` | Home — "Create Game" and "Join Game" buttons |
| `/create` | Paste Spotify playlist URL, choose game length, toggle tokens, enter name |
| `/join` | Enter room code + name → redirects to lobby |
| `/room/[code]` | Single route handling all in-game phases (lobby → playing → finished) |

The `/room/[code]` page renders one of four views based on game phase:
- **Lobby** — player list, shareable link + room code, Start button (host only)
- **Game** — active song player, active player's timeline interaction, all players' card counts, token counts
- **Result overlay** — shown after each turn: title, artist, year, who was right
- **Win screen** — winner name, final scores, "Play Again" button

---

## Game Settings (set at room creation)

| Setting | Options |
|---|---|
| Spotify playlist | URL (public playlist) |
| Game length | Short (5 cards) / Long (10 cards) |
| Tokens | Enabled / Disabled |

---

## Turn Structure

Each turn has the following phases in order:

### 1. `listening`
- Server picks the next track from the queue.
- Broadcasts `turn-started` to all clients with: `previewUrl` only.
- Title, artist, and year remain hidden in Redis.
- All players' browsers play the audio simultaneously.

### 2. `guessing` (active player only)
- Active player sees a form to optionally guess title + artist.
- Only the active player has a guess input — other players have no title/artist guess ability at any point.
- Active player submits their guess or skips.

### 3. `placing`
- Active player drags/places the card on their timeline.
- Other players (tokens enabled): can spend one token to call "HITSTER" and challenge the placement. First call wins — if two players call simultaneously, the server accepts whichever request arrives first; the second call is rejected and the token is not spent.
- Active player confirms placement submission.

### 4. `revealing`
- Server validates placement against the stored year.
- Server validates the active player's title + artist guess.
- Server resolves any HITSTER challenges.
- Broadcasts `turn-result` to all clients: title, artist, year, placement outcome, token changes.

### Outcomes

| Action | Result |
|---|---|
| Correct placement | Active player keeps the card on their timeline |
| Incorrect placement | Card is discarded |
| Active player guesses title + artist correctly | Active player earns 1 token |
| HITSTER challenge correct | Challenger claims the card; active player loses it |
| HITSTER challenge incorrect | Challenger loses their token |

**Win condition:** First player whose timeline reaches the target card count (5 or 10) wins.

---

## Token Rules (when tokens enabled)

| Action | Cost/Reward |
|---|---|
| Correctly guess title + artist (active player only) | +1 token earned |
| Call HITSTER to challenge a placement | Spend 1 token |
| HITSTER correct | Earn the contested card |
| HITSTER incorrect | Token is lost, no card change |

Players start with 0 tokens. Maximum 5 tokens at any time.

---

## Data Model (Redis)

**Key:** `game:{roomCode}` — TTL: 4 hours

```typescript
type GameState = {
  roomCode: string
  phase: "lobby" | "playing" | "finished"
  settings: {
    gameLength: 5 | 10
    tokensEnabled: boolean
  }
  hostId: string
  players: Player[]
  queue: Track[]           // full shuffled queue — never sent to clients
  currentTrack: Track | null  // server-side only until revealed
  activePlayerIndex: number
  turnPhase: "listening" | "guessing" | "placing" | "revealing"
  pendingGuess: {          // active player's title+artist guess this turn
    playerId: string
    title: string
    artist: string
  } | null
  pendingChallenge: {      // outstanding HITSTER challenge
    challengerId: string
  } | null
  winnerId: string | null
}

type Player = {
  id: string               // Pusher socket id
  name: string
  timeline: Card[]         // correctly placed cards, sorted by year
  tokens: number           // always 0 if tokensEnabled is false
}

type Track = {
  title: string
  artist: string
  year: number
  previewUrl: string
}

type Card = {
  title: string
  artist: string
  year: number
}
```

---

## What Clients Receive vs. What Stays Hidden

| Data | During turn | After reveal |
|---|---|---|
| `previewUrl` | ✅ sent to all | ✅ |
| `title` | ❌ hidden | ✅ revealed |
| `artist` | ❌ hidden | ✅ revealed |
| `year` | ❌ hidden | ✅ revealed |
| Full song queue | ❌ never sent | ❌ never sent |
| Other players' timeline years | ❌ hidden | ❌ hidden (card count only) |

---

## Pusher Events

**Channel:** `game-{roomCode}` (one channel per game room)

| Event | Direction | Payload |
|---|---|---|
| `player-joined` | server → all | player name, updated player list |
| `player-left` | server → all | updated player list |
| `game-started` | server → all | settings, player order |
| `turn-started` | server → all | active player id, `previewUrl` |
| `guess-submitted` | server → all | active player submitted guess (no content, just signal) |
| `hitster-called` | server → all | challenger name |
| `placement-submitted` | server → all | placement position (index) |
| `turn-result` | server → all | title, artist, year, placement correct/wrong, token deltas, updated timelines |
| `game-ended` | server → all | winner name, final timelines |

---

## API Routes

| Method + Path | Purpose |
|---|---|
| `POST /api/games` | Create game — fetch playlist, shuffle, store in Redis, return room code |
| `POST /api/games/[code]/join` | Join game — add player to Redis, trigger `player-joined` |
| `POST /api/games/[code]/start` | Host starts game — transition to playing, trigger `game-started` + first `turn-started` |
| `POST /api/games/[code]/guess` | Active player submits title+artist guess |
| `POST /api/games/[code]/place` | Active player submits timeline placement |
| `POST /api/games/[code]/hitster` | Player calls HITSTER challenge |
| `POST /api/games/[code]/next` | Active player advances to next turn after reveal |

---

## Spotify Integration

- Authentication: Client Credentials flow (server-side only, using `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` env vars)
- Playlist fetch: `GET https://api.spotify.com/v1/playlists/{id}/tracks` (paginated if >100 tracks)
- Fields used per track: `name` (title), `artists[0].name`, `album.release_date` (year extracted), `preview_url`
- Tracks with `preview_url: null` are filtered out before shuffling
- Shuffle algorithm: Fisher-Yates

---

## Deployment

- Single Vercel project (Next.js)
- Environment variables: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- Public env vars (exposed to browser): `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`
