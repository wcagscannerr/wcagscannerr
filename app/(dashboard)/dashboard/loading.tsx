export default function Loading() {
  return (
    <div className="p-8">
      <div className="h-8 w-32 bg-surface-elevated rounded animate-pulse mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-surface border border-border 
            rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-surface-elevated rounded w-16 mb-3" />
            <div className="h-8 bg-surface-elevated rounded w-12" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {[1,2].map(i => (
          <div key={i} className="bg-surface border border-border 
            rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-surface-elevated rounded w-3/4 mb-3" />
            <div className="h-3 bg-surface-elevated rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}