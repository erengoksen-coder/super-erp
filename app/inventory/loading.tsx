export default function InventoryLoading() {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="h-8 w-40 bg-gray-700 rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-10 w-28 bg-gray-800 rounded-lg animate-pulse" />
          <div className="h-10 w-24 bg-gray-800 rounded-lg animate-pulse" />
        </div>
      </div>
      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <div className="h-12 bg-gray-800/50 border-b border-gray-800 grid grid-cols-4 gap-4 px-4 items-center">
          <div className="h-4 w-20 bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-16 bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-20 bg-gray-700 rounded animate-pulse" />
        </div>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div key={i} className="h-14 border-b border-gray-800/50 grid grid-cols-4 gap-4 px-4 items-center">
            <div className="h-4 w-16 bg-gray-700 rounded animate-pulse" />
            <div className="h-4 flex-1 bg-gray-800 rounded animate-pulse" />
            <div className="h-4 w-14 bg-gray-800 rounded animate-pulse" />
            <div className="h-4 w-12 bg-gray-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
