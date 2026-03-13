import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-4">byaxon</h1>
        <p className="text-zinc-400 mb-8 max-w-md text-lg">
          this is the homepage of all memes of things that are byaxon
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 transition"
        >
          Admin Login
        </Link>
      </div>

      <footer className="absolute bottom-6 text-center px-4">
        <p className="text-zinc-600 text-sm max-w-lg">
          This site has no affiliation with Axon Enterprise, Inc. or any of its subsidiaries.
          This is entirely satire and parody.
        </p>
      </footer>
    </div>
  );
}
