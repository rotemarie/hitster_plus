import type { Track } from './types'

interface SpotifyTrack {
  name: string
  artists: { name: string }[]
  album: { release_date: string }
  preview_url: string | null
}

interface SpotifyPlaylistItem {
  track: SpotifyTrack | null
}

export function extractPlaylistId(url: string): string {
  const match = url.match(/playlist\/([A-Za-z0-9]+)/)
  if (!match) throw new Error('Invalid Spotify playlist URL')
  return match[1]
}

export function buildTrackFromSpotify(item: SpotifyPlaylistItem): Track | null {
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
    const res: Response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`Spotify playlist fetch failed: ${res.status}`)
    const data: { next: string | null; items: SpotifyPlaylistItem[] } = await res.json()

    for (const item of data.items) {
      const track = buildTrackFromSpotify(item)
      if (track) tracks.push(track)
    }

    url = data.next ?? null
  }

  return tracks
}
