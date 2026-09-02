import { redirect } from "next/navigation";
import { Waypoints } from "lucide-react";
import { updatePasswordAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
const fieldClassName = "mt-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-500/20";

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { user } = await getUser();
  if (!user) redirect("/forgot-password?error=That%20reset%20link%20is%20invalid%20or%20has%20expired.%20Request%20a%20new%20one.");
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  return <main className="flex min-h-screen items-center justify-center px-4 py-10"><div className="w-full max-w-md"><div className="mb-6 flex items-center gap-2 text-stone-950"><Waypoints className="size-5" aria-hidden="true" /><span className="text-lg font-semibold">Stride</span></div><Card><CardHeader><CardTitle>Choose a New Password</CardTitle></CardHeader><CardContent className="space-y-5">{error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}<form action={updatePasswordAction} className="space-y-4"><label className="grid gap-1.5 text-sm font-medium text-stone-700">New Password<input name="password" type="password" autoComplete="new-password" required minLength={8} className={fieldClassName} /></label><label className="grid gap-1.5 text-sm font-medium text-stone-700">Confirm New Password<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} className={fieldClassName} /></label><Button type="submit" className="w-full">Update Password</Button></form></CardContent></Card></div></main>;
}
