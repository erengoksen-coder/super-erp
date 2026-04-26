export default function InventoryLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300 p-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-20 bg-gray-700/50 rounded animate-pulse" />
          <div className="h-8 w-64 bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-24 bg-gray-800 rounded-xl animate-pulse" />
          <div className="h-10 w-32 bg-primary/20 rounded-xl animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl border border-white/5 bg-white/5 p-5 space-y-2">
             <div className="h-3 w-16 bg-white/10 rounded animate-pulse" />
             <div className="h-6 w-20 bg-white/10 rounded animate-pulse" />
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-white/5 bg-white/5 overflow-hidden">
        <div className="h-14 bg-white/5 border-b border-white/5 px-6 flex items-center">
           <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-white/5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-14 flex items-center gap-6 px-6">
              <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
              <div className="h-4 flex-1 max-w-md bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}