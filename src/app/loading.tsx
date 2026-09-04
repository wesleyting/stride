import { AppFrame } from "@/components/stride/app-frame";

export default function Loading() {
  return (
    <AppFrame>
      <main className="min-w-0 flex-1" aria-busy="true" aria-label="Loading Stride">
        <div className="stride-loading-bar h-0.5 bg-stone-900" />
        <div className="space-y-7 px-4 py-7 sm:px-7 sm:py-9">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-7 w-32 animate-pulse rounded-md bg-stone-200" />
              <div className="h-4 w-56 max-w-[65vw] animate-pulse rounded bg-stone-100" />
            </div>
            <div className="h-9 w-28 animate-pulse rounded-lg bg-stone-200" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-stone-100" />)}
          </div>
          <div className="space-y-3">
            <div className="h-5 w-24 animate-pulse rounded bg-stone-200" />
            <div className="h-48 animate-pulse rounded-xl bg-stone-100 sm:h-64" />
          </div>
        </div>
      </main>
    </AppFrame>
  );
}
