import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { authHref } from "@/lib/return-path";

export function SessionSidebarFooter({ signedIn, isGuest = false, next }: { signedIn: boolean; isGuest?: boolean; next: string }) {
  if (isGuest) {
    return <div className="grid gap-1"><p className="px-3 text-xs font-medium text-stone-500">Using Stride as a guest</p><Link href={authHref("/sign-up", next)} className="rounded-md px-3 py-2 text-sm font-semibold text-stone-900 transition hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-stone-500">Save Your Progress</Link><FooterPrivacyLink /></div>;
  }

  if (signedIn) {
    return <div className="grid gap-1"><FooterPrivacyLink /><form action={signOutAction}><button type="submit" className="w-full rounded-md px-3 py-2 text-left text-sm text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 focus-visible:ring-2 focus-visible:ring-stone-500">Sign out</button></form></div>;
  }

  return <div className="grid gap-1"><Link href={authHref("/sign-up", next)} className="rounded-md px-3 py-2 text-sm font-semibold text-stone-900 transition hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-stone-500">Create Account</Link><Link href={authHref("/sign-in", next)} className="rounded-md px-3 py-2 text-sm text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 focus-visible:ring-2 focus-visible:ring-stone-500">Sign In</Link><FooterPrivacyLink /></div>;
}

function FooterPrivacyLink() {
  return <Link href="/privacy" className="rounded-md px-3 py-2 text-sm text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 focus-visible:ring-2 focus-visible:ring-stone-500">Privacy</Link>;
}
