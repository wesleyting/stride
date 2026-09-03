"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-stone-200 bg-white px-6 py-8 text-center shadow-sm">
        <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-stone-100 text-stone-600">
          <AlertCircle className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-stone-950">Stride hit a snag</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Your data is still safe. This may be a temporary connection problem.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" onClick={() => retry()} className={buttonVariants()}>
            <RotateCcw data-icon="inline-start" aria-hidden="true" />
            Try Again
          </button>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>Return Home</Link>
        </div>
        {error.digest ? <p className="mt-5 text-xs text-stone-400">Error reference: {error.digest}</p> : null}
      </section>
    </main>
  );
}
