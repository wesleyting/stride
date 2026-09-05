import { redirect } from "next/navigation";
import { finishGuestUpgradeAction } from "@/app/actions";
import { AuthShell, authFieldClassName } from "@/components/stride/auth-shell";
import { Button } from "@/components/ui/button";
import { getUser, isAccountSetupPending } from "@/lib/auth";
import { safeReturnPath } from "@/lib/return-path";

export const dynamic = "force-dynamic";

export default async function FinishSignUpPage({ searchParams }: PageProps<"/finish-sign-up">) {
  const params = await searchParams;
  const next = safeReturnPath(params.next);
  const { user } = await getUser();
  if (!user) redirect(`/sign-up?next=${encodeURIComponent(next)}`);
  if (user.is_anonymous) redirect(`/sign-up?next=${encodeURIComponent(next)}&error=${encodeURIComponent("Confirm your email before choosing a password.")}`);
  if (!isAccountSetupPending(user)) redirect(next);
  const error = typeof params.error === "string" ? params.error : "";

  return (
    <AuthShell eyebrow="Almost done" title="Protect Your Practice" description="Choose a password so you can return to your songs from any device.">
      <div className="space-y-5">
        {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
        <form action={finishGuestUpgradeAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <label className="grid text-sm font-medium text-stone-700">Password<input name="password" type="password" autoComplete="new-password" required minLength={8} className={authFieldClassName} /><span className="mt-1.5 text-xs font-normal text-stone-500">Use at least 8 characters.</span></label>
          <label className="grid text-sm font-medium text-stone-700">Confirm Password<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} className={authFieldClassName} /></label>
          <Button type="submit" size="lg" className="w-full">Finish Creating Account</Button>
        </form>
      </div>
    </AuthShell>
  );
}
