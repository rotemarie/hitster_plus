'use client'

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(Array.from(array, b => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(Array.from(new Uint8Array(digest), b => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  clientId: string,
  redirectUri: string
): Promise<string> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  })
  const data = await res.json()
  console.log('[spotify-pkce] token exchange status:', res.status, 'data keys:', Object.keys(data))
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${JSON.stringify(data)}`)
  return data.access_token
}
