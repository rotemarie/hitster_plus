import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <h1 className="text-5xl font-bold tracking-tight">Hitster Plus</h1>
      <p className="text-gray-400 text-lg">Play Hitster with friends using your Spotify playlist</p>
      <div className="flex flex-col sm:flex-row gap-4 mt-4">
        <Link
          href="/create"
          className="px-8 py-4 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl text-xl transition"
        >
          Create Game
        </Link>
        <Link
          href="/join"
          className="px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl text-xl transition"
        >
          Join Game
        </Link>
      </div>
    </main>
  )
}
