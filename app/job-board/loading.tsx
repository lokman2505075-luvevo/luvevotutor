export default function JobBoardLoading() {
  return <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8" aria-label="জব লোড হচ্ছে"><div className="mx-auto max-w-6xl"><div className="h-56 animate-pulse rounded-2xl bg-blue-950/10" /><div className="mt-8 grid gap-5 md:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-64 animate-pulse rounded-2xl bg-white shadow-sm"><span className="sr-only">লোড হচ্ছে</span></div>)}</div></div></div>
}
