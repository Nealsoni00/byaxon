import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <p className="text-zinc-400 mb-8">Page not found</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 transition"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
