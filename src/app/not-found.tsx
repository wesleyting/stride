import Link from "next/link";
import { Music2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-stone-200 bg-white px-6 py-8 text-center shadow-sm">
        <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-stone-100 text-stone-600">
          <Music2 className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-stone-950">This page is not here</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          The song or page may have moved, or you may not have access to it.
        </p>
        <Link href="/" className={`${buttonVariants()} mt-6`}>Return Home</Link>
      </section>
    </main>
  );
}
