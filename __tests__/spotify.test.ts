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
