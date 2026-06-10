import { NextResponse } from 'next/server'
import type { Track } from '@/lib/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  const match = url.match(/deezer\.com\/(?:[a-z]{2}\/)?playlist\/(\d+)/)
  if (!match) return NextResponse.json({ error: 'Invalid Deezer playlist URL' }, { status: 400 })
  const playlistId = match[1]

  const tracks: Track[] = []
  let index = 0

  while (true) {
    const res = await fetch(`https://api.deezer.com/playlist/${playlistId}/tracks?limit=100&index=${index}`)
    if (!res.ok) return NextResponse.json({ error: `Deezer returned ${res.status}` }, { status: 502 })
    const data = await res.json()
    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 502 })

    for (const track of data.data ?? []) {
      if (!track.preview) continue
      const releaseStr: string | undefined = track.release_date ?? track.album?.release_date
      const year = releaseStr ? parseInt(releaseStr.slice(0, 4), 10) : 0
      if (!year) continue
      tracks.push({
        title: track.title,
        artist: track.artist?.name ?? 'Unknown',
        year,
        previewUrl: track.preview,
      })
    }

    if (!data.next || (data.data?.length ?? 0) < 100) break
    index += 100
  }

  return NextResponse.json({ tracks })
}
