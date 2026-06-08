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
