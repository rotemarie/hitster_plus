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

const VERSION_KEYWORDS = 'remaster(?:ed)?|radio(?: edit)?|single|album|original|live|acoustic|version|edit|mix|feat\\.?|ft\\.?|explicit|clean|mono|stereo|demo|instrumental|extended|deluxe|bonus|anniversary|special'

// Returns the core title stripped of version/edition suffixes, preserving original casing.
export function cleanTitle(s: string): string {
  return s
    .replace(/\s*\(.*?\)/g, '')
    .replace(/\s*\[.*?\]/g, '')
    // handles both "- Remastered 2019" and "- 2019 Remaster"
    .replace(new RegExp(`\\s*-\\s*(?:\\d{4}\\s*)?(${VERSION_KEYWORDS}).*`, 'gi'), '')
    .replace(new RegExp(`\\s*-\\s*(${VERSION_KEYWORDS})(?:\\s+\\d{4})?.*`, 'gi'), '')
    .replace(/^["""]+|["""]+$/g, '')  // strip leading/trailing quote chars (e.g. "Heroes")
    .trim()
}

function normalizeTitle(s: string): string {
  return cleanTitle(s)
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Strips spaces and punctuation so "Sound Garden" matches "Soundgarden"
function normalizeArtist(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s*feat\.?.*/i, '')
    .replace(/\s*ft\.?.*/i, '')
    .replace(/[^a-z0-9]/g, '')
}

export function guessMatchesTrack(
  guess: { title: string; artist: string },
  track: Track
): boolean {
  return (
    normalizeTitle(guess.title) === normalizeTitle(track.title) &&
    normalizeArtist(guess.artist) === normalizeArtist(track.artist)
  )
}

export function checkWinner(players: Player[], gameLength: number): Player | null {
  return players.find(p => p.timeline.length >= gameLength) ?? null
}
