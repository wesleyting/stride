import Link from "next/link";
import { redirect } from "next/navigation";
import { signInAction } from "@/app/actions";
import { AuthShell, authFieldClassName } from "@/components/stride/auth-shell";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth";
import { authHref, safeReturnPath } from "@/lib/return-path";

export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const params = await searchParams;
  const next = safeReturnPath(params.next);
  const userResult = await getUser();
  if (userResult.user) redirect(next);

  const error = typeof params.error === "string" ? params.error : "";
  const message = typeof params.message === "string" ? params.message : "";

  return (
    <AuthShell eyebrow="Welcome back" title="Continue Your Practice" description="Sign in to pick up from your songs, notes, and tracked sessions.">
      <div className="space-y-5">
        {error || message ? <div role={error ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-stone-200 bg-stone-50 text-stone-700"}`}>{error || message}</div> : null}
        <form action={signInAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <label className="grid text-sm font-medium text-stone-700">Email<input name="email" type="email" autoComplete="email" required className={authFieldClassName} /></label>
          <label className="grid text-sm font-medium text-stone-700">
            <span className="flex items-center justify-between gap-3"><span>Password</span><Link href="/forgot-password" className="font-normal text-stone-600 underline-offset-4 hover:text-stone-950 hover:underline">Forgot password?</Link></span>
            <input name="password" type="password" autoComplete="current-password" required minLength={8} className={authFieldClassName} />
          </label>
          <Button type="submit" size="lg" className="w-full">Sign In</Button>
        </form>
        <p className="text-center text-sm text-stone-600">New to Stride? <Link href={authHref("/sign-up", next)} className="font-semibold text-stone-950 underline-offset-4 hover:underline">Create an account</Link></p>
        <p className="text-center"><Link href="/" className="text-xs text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline">Continue browsing</Link></p>
      </div>
    </AuthShell>
  );
}
