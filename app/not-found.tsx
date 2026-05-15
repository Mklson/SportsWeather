import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-3xl font-bold text-white">Route not found</h1>
      <p className="text-gray-400">The route you are looking for does not exist.</p>
      <Link
        href="/"
        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-medium transition-colors"
      >
        Back to start
      </Link>
    </main>
  );
}
