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
