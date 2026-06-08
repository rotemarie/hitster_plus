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
