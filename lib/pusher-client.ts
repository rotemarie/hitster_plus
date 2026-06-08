import PusherJS from 'pusher-js'

let instance: PusherJS | null = null

export function getPusherClient(): PusherJS {
  if (!instance) {
    instance = new PusherJS(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })
  }
  return instance
}
