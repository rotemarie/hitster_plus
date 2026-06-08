import { Redis } from '@upstash/redis'
import type { GameState } from './types'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const GAME_TTL_SECONDS = 14400 // 4 hours

export async function getGame(roomCode: string): Promise<GameState | null> {
  return redis.get<GameState>(`game:${roomCode}`)
}

export async function saveGame(state: GameState): Promise<void> {
  await redis.set(`game:${state.roomCode}`, state, { ex: GAME_TTL_SECONDS })
}
