import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function PageHeader({
  backHref,
  backLabel,
  title,
  actions,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href={backHref}
          aria-label={backLabel}
          className="-ml-2 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-950"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <h1 className="min-w-0 text-2xl leading-tight font-semibold tracking-tight text-stone-950">
          {title}
        </h1>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
