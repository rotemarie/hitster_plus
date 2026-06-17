export async function fetchFreshPreviewUrl(deezerId: number): Promise<string | null> {
  try {
    const res = await fetch(`https://api.deezer.com/track/${deezerId}`)
    if (!res.ok) return null
    const data = await res.json()
    return (data.preview as string) || null
  } catch {
    return null
  }
}
