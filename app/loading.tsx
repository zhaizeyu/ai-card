export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="h-5 w-32 animate-pulse rounded bg-ink/10" />
      <div className="mt-4 h-10 w-72 max-w-full animate-pulse rounded bg-ink/10" />
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-56 animate-pulse rounded-lg border border-ink/10 bg-white shadow-card">
            <div className="h-24 rounded-t-lg bg-ink/[0.06]" />
            <div className="space-y-3 p-4">
              <div className="h-4 w-2/3 rounded bg-ink/10" />
              <div className="h-3 w-full rounded bg-ink/10" />
              <div className="h-3 w-4/5 rounded bg-ink/10" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
