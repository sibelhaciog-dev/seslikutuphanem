export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10" aria-busy="true" aria-label="Yükleniyor">
      <div className="mb-6 h-28 animate-pulse rounded-panel bg-white" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="aspect-2/3 animate-pulse rounded-card bg-white" />
        ))}
      </div>
    </div>
  )
}
