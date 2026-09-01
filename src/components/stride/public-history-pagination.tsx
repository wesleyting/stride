import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type PageItem = number | "ellipsis";

export function PublicHistoryPagination({
  currentPage,
  totalPages,
  basePath,
  pageParam = "historyPage",
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
  pageParam?: string;
}) {
  if (totalPages <= 1) return null;

  const hrefFor = (page: number) =>
    `${basePath}?${pageParam}=${page}#practice-history`;
  const pages = pageItems(currentPage, totalPages);

  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-1 border-t border-stone-200 px-4 py-4"
      aria-label="Practice history pages"
    >
      <PageLink
        href={hrefFor(Math.max(1, currentPage - 1))}
        label="Previous page"
        disabled={currentPage === 1}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </PageLink>
      {pages.map((page, index) =>
        page === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="flex size-9 items-center justify-center text-sm text-stone-400" aria-hidden="true">…</span>
        ) : (
          <PageLink
            key={page}
            href={hrefFor(page)}
            label={`Page ${page}`}
            current={page === currentPage}
          >
            {page}
          </PageLink>
        ),
      )}
      <PageLink
        href={hrefFor(Math.min(totalPages, currentPage + 1))}
        label="Next page"
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  label,
  current = false,
  disabled = false,
  children,
}: {
  href: string;
  label: string;
  current?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const className = `flex size-9 items-center justify-center rounded-md text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-stone-500 ${
    current
      ? "bg-stone-900 text-white"
      : disabled
        ? "pointer-events-none text-stone-300"
        : "text-stone-600 hover:bg-stone-100 hover:text-stone-950"
  }`;

  if (disabled) return <span className={className} aria-disabled="true">{children}</span>;
  return <Link href={href} className={className} aria-label={label} aria-current={current ? "page" : undefined}>{children}</Link>;
}

function pageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const numbers = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const items: PageItem[] = [];

  numbers.forEach((page, index) => {
    if (index > 0 && page - numbers[index - 1] > 1) items.push("ellipsis");
    items.push(page);
  });

  return items;
}
