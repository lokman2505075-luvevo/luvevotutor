export default function Loading() {
  return (
    <div className="min-h-screen bg-white px-4 py-16 text-gray-900">
      <div className="mx-auto max-w-6xl animate-pulse">
        <div className="mb-8 h-8 w-40 rounded bg-blue-100" />
        <div className="mb-6 h-12 w-full rounded bg-blue-100" />
        <div className="mb-4 flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-10 w-24 rounded bg-blue-100" />
          ))}
        </div>
        <div className="mb-4 h-14 w-full rounded bg-blue-100" />
        <div className="overflow-hidden rounded-xl border border-blue-100">
          <div className="h-16 w-full bg-blue-50" />
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex gap-3 border-t border-blue-100 bg-white p-4">
              <div className="h-6 w-40 rounded bg-blue-100" />
              <div className="h-6 w-24 rounded bg-blue-100" />
              <div className="h-6 w-24 rounded bg-blue-100" />
              <div className="h-6 w-24 rounded bg-blue-100" />
              <div className="h-6 w-28 rounded bg-blue-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
