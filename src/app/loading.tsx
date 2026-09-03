export default function Loading() {
  return (
    <main className="min-h-screen bg-stone-100 p-4 md:p-6" aria-busy="true" aria-label="Loading Stride">
      <div className="mx-auto min-h-[calc(100vh-3rem)] max-w-7xl overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="h-1 animate-pulse bg-stone-900" />
        <div className="space-y-6 px-5 py-7 sm:px-8">
          <div className="h-7 w-36 animate-pulse rounded-md bg-stone-200" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-40 animate-pulse rounded-xl bg-stone-100" />
            <div className="h-40 animate-pulse rounded-xl bg-stone-100" />
          </div>
        </div>
      </div>
    </main>
  );
}
