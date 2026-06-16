import { NextResponse } from 'next/server'

interface TrackInput {
  title: string
  artist: string
  year: number
}

function cleanQuery(s: string) {
  return s.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').replace(/feat\.?.*/i, '').trim()
}

export async function POST(request: Request) {
  const { tracks }: { tracks: TrackInput[] } = await request.json()
  if (!Array.isArray(tracks)) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  console.log(`[deezer-previews] searching for ${tracks.length} tracks`)
  if (tracks.length > 0) console.log(`[deezer-previews] first: "${tracks[0].title}" by "${tracks[0].artist}"`)

  const enriched = await Promise.all(
    tracks.map(async (track) => {
      try {
        const title = cleanQuery(track.title)
        const artist = cleanQuery(track.artist)
        const q = encodeURIComponent(`${title} ${artist}`)
        const res = await fetch(`https://api.deezer.com/search?q=${q}&limit=5`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        })
        console.log(`[deezer-previews] "${title}" → status ${res.status}`)
        if (!res.ok) return null
        const data = await res.json()
        const match = (data.data ?? []).find((t: { preview: string }) => t.preview)
        return match ? { title: track.title, artist: track.artist, year: track.year, previewUrl: match.preview } : null
      } catch (err) {
        console.error(`[deezer-previews] error for "${track.title}":`, err)
        return null
      }
    })
  )

  const results = enriched.filter(Boolean)
  console.log(`[deezer-previews] found previews for ${results.length}/${tracks.length} tracks`)
  return NextResponse.json({ tracks: results, spotifyCount: tracks.length, previewCount: results.length })
}
