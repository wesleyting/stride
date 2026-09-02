import Link from "next/link";
import { Waypoints } from "lucide-react";
import { requestPasswordResetAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
const fieldClassName = "mt-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-500/20";

export default async function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const message = typeof params.message === "string" ? params.message : "";
  return <main className="flex min-h-screen items-center justify-center px-4 py-10"><div className="w-full max-w-md"><Link href="/sign-in" className="mb-6 flex w-fit items-center gap-2 text-stone-950"><Waypoints className="size-5" aria-hidden="true" /><span className="text-lg font-semibold">Stride</span></Link><Card><CardHeader><CardTitle>Reset Password</CardTitle></CardHeader><CardContent className="space-y-5">{error || message ? <div role={error ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-stone-200 bg-stone-50 text-stone-700"}`}>{error || message}</div> : <p className="text-sm leading-6 text-stone-600">Enter your account email and we’ll send you a secure reset link.</p>}<form action={requestPasswordResetAction} className="space-y-4"><label className="grid gap-1.5 text-sm font-medium text-stone-700">Email<input name="email" type="email" autoComplete="email" required className={fieldClassName} /></label><Button type="submit" className="w-full">Send Reset Link</Button></form><Link href="/sign-in" className="inline-flex text-sm font-medium text-stone-700 underline-offset-4 hover:text-stone-950 hover:underline">Back to Sign In</Link></CardContent></Card></div></main>;
}
