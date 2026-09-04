import { AppFrame } from "@/components/stride/app-frame";

export default function Loading() {
  return (
    <AppFrame>
      <main className="min-w-0 flex-1" aria-busy="true" aria-label="Loading Stride">
        <div className="h-1 animate-pulse bg-stone-900" />
        <div className="space-y-6 px-4 py-7 sm:px-7">
          <div className="h-7 w-36 animate-pulse rounded-md bg-stone-200" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-40 animate-pulse rounded-xl bg-stone-100" />
            <div className="h-40 animate-pulse rounded-xl bg-stone-100" />
          </div>
        </div>
      </main>
    </AppFrame>
  );
}
