import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { authHref } from "@/lib/return-path";

export function SessionSidebarFooter({ signedIn, next }: { signedIn: boolean; next: string }) {
  if (signedIn) {
    return <form action={signOutAction}><button type="submit" className="w-full rounded-md px-3 py-2 text-left text-sm text-stone-500 transition hover:bg-stone-100 hover:text-stone-900">Sign out</button></form>;
  }

  return <div className="grid gap-1"><Link href={authHref("/sign-up", next)} className="rounded-md px-3 py-2 text-sm font-semibold text-stone-900 transition hover:bg-stone-100">Create Account</Link><Link href={authHref("/sign-in", next)} className="rounded-md px-3 py-2 text-sm text-stone-500 transition hover:bg-stone-100 hover:text-stone-900">Sign In</Link></div>;
}
