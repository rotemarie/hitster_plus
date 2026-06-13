import { NextResponse } from 'next/server'

interface TrackInput {
  title: string
  artist: string
  year: number
}

export async function POST(request: Request) {
  const { tracks }: { tracks: TrackInput[] } = await request.json()
  if (!Array.isArray(tracks)) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const enriched = await Promise.all(
    tracks.map(async (track) => {
      try {
        const q = encodeURIComponent(`${track.title} ${track.artist}`)
        const res = await fetch(`https://api.deezer.com/search?q=${q}&limit=3`)
        if (!res.ok) return null
        const data = await res.json()
        const match = (data.data ?? []).find((t: { preview: string }) => t.preview)
        if (!match) return null
        return { title: track.title, artist: track.artist, year: track.year, previewUrl: match.preview }
      } catch {
        return null
      }
    })
  )

  return NextResponse.json({ tracks: enriched.filter(Boolean) })
}
