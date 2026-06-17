import { NextResponse } from 'next/server'

interface TrackInput {
  title: string
  artist: string
  year: number
}

interface Track extends TrackInput {
  previewUrl: string
  deezerId: number
}

function cleanQuery(s: string) {
  return s.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').replace(/feat\.?.*/i, '').trim()
}

async function searchDeezerPreview(track: TrackInput): Promise<Track | null> {
  const title = cleanQuery(track.title)
  const artist = cleanQuery(track.artist)
  const q = encodeURIComponent(`${title} ${artist}`)
  try {
    const res = await fetch(`https://api.deezer.com/search?q=${q}&limit=5`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!res.ok) return null
    const data = await res.json()
    const match = (data.data ?? []).find((t: { preview: string }) => t.preview)
    if (!match) return null
    return { title: track.title, artist: track.artist, year: track.year, previewUrl: match.preview, deezerId: match.id }
  } catch {
    return null
  }
}

const BATCH_SIZE = 5

export async function POST(request: Request) {
  const { tracks }: { tracks: TrackInput[] } = await request.json()
  if (!Array.isArray(tracks)) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const results: (Track | null)[] = []
  for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
    const batch = tracks.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(batch.map(searchDeezerPreview))
    results.push(...batchResults)
  }

  const found = results.filter((t): t is Track => t !== null)
  console.log(`[deezer-previews] found ${found.length}/${tracks.length}`)
  return NextResponse.json({ tracks: found, spotifyCount: tracks.length, previewCount: found.length })
}
