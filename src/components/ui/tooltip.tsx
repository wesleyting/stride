import type { ReactNode } from "react";

export function Tooltip({ content, children }: { content: string; children: ReactNode }) {
  return <span className="group/tooltip relative inline-flex">
    {children}
    <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-52 -translate-x-1/2 translate-y-1 rounded-md bg-stone-950 px-2.5 py-1.5 text-[0.6875rem] font-medium leading-4 text-white opacity-0 shadow-lg transition-[opacity,transform] duration-150 ease-out group-hover/tooltip:translate-y-0 group-hover/tooltip:opacity-100 group-focus-within/tooltip:translate-y-0 group-focus-within/tooltip:opacity-100">
      {content}
    </span>
  </span>;
}
