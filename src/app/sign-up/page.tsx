import Link from "next/link";
import { redirect } from "next/navigation";
import { signUpAction } from "@/app/actions";
import { AuthShell, authFieldClassName } from "@/components/stride/auth-shell";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth";
import { authHref, safeReturnPath } from "@/lib/return-path";

export const dynamic = "force-dynamic";

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const params = await searchParams;
  const next = safeReturnPath(params.next);
  const userResult = await getUser();
  if (userResult.user) redirect(next);

  const error = typeof params.error === "string" ? params.error : "";

  return (
    <AuthShell eyebrow="Create your account" title="Make Practice Easier to Return To" description="Start with one song. Add notes, references, and tracked time only when they help.">
      <div className="space-y-5">
        {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
        <form action={signUpAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <label className="grid text-sm font-medium text-stone-700">Email<input name="email" type="email" autoComplete="email" required className={authFieldClassName} /></label>
          <label className="grid text-sm font-medium text-stone-700">Password<input name="password" type="password" autoComplete="new-password" required minLength={8} aria-describedby="password-help" className={authFieldClassName} /><span id="password-help" className="mt-1.5 text-xs font-normal text-stone-500">Use at least 8 characters.</span></label>
          <Button type="submit" size="lg" className="w-full">Create Account</Button>
        </form>
        <p className="text-center text-sm text-stone-600">Already use Stride? <Link href={authHref("/sign-in", next)} className="font-semibold text-stone-950 underline-offset-4 hover:underline">Sign in</Link></p>
        <p className="text-center text-xs leading-5 text-stone-500">Your song library and practice history are private unless you explicitly share them.</p>
      </div>
    </AuthShell>
  );
}
