import Link from "next/link";
import { Clock3, NotebookPen, Waypoints } from "lucide-react";

export const authFieldClassName =
  "mt-1.5 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 hover:border-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="stride-auth-enter min-h-screen bg-stone-100 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-5xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm md:min-h-[42rem] md:grid-cols-[minmax(0,0.9fr)_minmax(24rem,1.1fr)]">
        <section className="hidden border-r border-stone-200 bg-stone-950 p-9 text-white md:flex md:flex-col">
          <Link href="/" className="flex w-fit items-center gap-2 rounded-md text-lg font-semibold focus-visible:ring-2 focus-visible:ring-white">
            <Waypoints className="size-5" aria-hidden="true" />
            Stride
          </Link>
          <div className="my-auto max-w-sm py-12">
            <p className="text-sm font-semibold text-stone-400">Guitar practice, remembered.</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Know where you left off.</h2>
            <p className="mt-4 text-sm leading-7 text-stone-300">
              Keep your songs, practice notes, references, and tracked time together without turning practice into paperwork.
            </p>
            <div className="mt-8 grid gap-3 text-sm text-stone-300">
              <p className="flex items-center gap-3"><Clock3 className="size-4 text-stone-500" aria-hidden="true" />Time practice without losing focus</p>
              <p className="flex items-center gap-3"><NotebookPen className="size-4 text-stone-500" aria-hidden="true" />Return to useful notes when you need them</p>
            </div>
          </div>
          <p className="text-xs text-stone-500">Your private practice data stays tied to your account.</p>
        </section>

        <section className="flex items-center justify-center px-5 py-8 sm:px-10 md:px-14">
          <div className="w-full max-w-sm">
            <Link href="/" className="mb-9 flex w-fit items-center gap-2 rounded-md text-lg font-semibold text-stone-950 focus-visible:ring-2 focus-visible:ring-stone-500 md:hidden">
              <Waypoints className="size-5" aria-hidden="true" />
              Stride
            </Link>
            <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">{eyebrow}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-stone-600">{description}</p>
            <div className="mt-7">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
