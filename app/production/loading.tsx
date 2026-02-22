export default function ProductionLoading() {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="h-8 w-56 bg-gray-700 rounded animate-pulse" />
        <div className="h-10 w-36 bg-gray-800 rounded-lg animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-lg border border-gray-800 bg-gray-900/80 p-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 w-3/4 bg-gray-700 rounded" />
              <div className="h-3 w-1/2 bg-gray-800 rounded" />
              <div className="h-3 w-full bg-gray-800 rounded" />
              <div className="h-8 w-20 bg-gray-700 rounded mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
