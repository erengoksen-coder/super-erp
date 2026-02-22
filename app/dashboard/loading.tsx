export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="space-y-3">
        <div className="h-4 w-32 bg-gray-700 rounded animate-pulse" />
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-11 w-32 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border border-gray-800 bg-gray-900/80 p-5">
            <div className="animate-pulse flex items-start justify-between gap-3">
              <div className="space-y-2 flex-1">
                <div className="h-3 w-20 bg-gray-700 rounded" />
                <div className="h-7 w-24 bg-gray-700 rounded" />
                <div className="h-3 w-14 bg-gray-800 rounded" />
              </div>
              <div className="h-10 w-10 bg-gray-700 rounded-xl shrink-0" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border border-gray-800 bg-gray-900/80 p-6 h-64">
          <div className="animate-pulse h-full flex flex-col gap-3">
            <div className="h-5 w-40 bg-gray-700 rounded" />
            <div className="flex-1 bg-gray-800/50 rounded" />
          </div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/80 p-6 h-64">
          <div className="animate-pulse h-full flex flex-col gap-3">
            <div className="h-5 w-40 bg-gray-700 rounded" />
            <div className="flex-1 bg-gray-800/50 rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}
