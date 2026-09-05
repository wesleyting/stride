import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { authHref } from "@/lib/return-path";

export function SessionSidebarFooter({ signedIn, isGuest = false, next }: { signedIn: boolean; isGuest?: boolean; next: string }) {
  if (isGuest) {
    return <div className="grid gap-1"><p className="px-3 text-xs font-medium text-stone-500">Using Stride as a guest</p><Link href={authHref("/sign-up", next)} className="rounded-md px-3 py-2 text-sm font-semibold text-stone-900 transition hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-stone-500">Save Your Progress</Link></div>;
  }

  if (signedIn) {
    return <form action={signOutAction}><button type="submit" className="w-full rounded-md px-3 py-2 text-left text-sm text-stone-500 transition hover:bg-stone-100 hover:text-stone-900">Sign out</button></form>;
  }

  return <div className="grid gap-1"><Link href={authHref("/sign-up", next)} className="rounded-md px-3 py-2 text-sm font-semibold text-stone-900 transition hover:bg-stone-100">Create Account</Link><Link href={authHref("/sign-in", next)} className="rounded-md px-3 py-2 text-sm text-stone-500 transition hover:bg-stone-100 hover:text-stone-900">Sign In</Link></div>;
}
