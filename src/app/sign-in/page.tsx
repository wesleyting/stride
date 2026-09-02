import Link from "next/link";
import { redirect } from "next/navigation";
import { Waypoints } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth";
import { signInAction } from "../actions";

export const dynamic = "force-dynamic";

const fieldClassName =
  "mt-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-500/20";

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const userResult = await getUser();
  if (userResult.user) {
    redirect("/");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const message = typeof params.message === "string" ? params.message : "";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2 text-stone-950">
          <Waypoints className="size-5" aria-hidden="true" />
          <span className="text-lg font-semibold">Stride</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {error || message ? (
              <div
                role={error ? "alert" : "status"}
                className={`rounded-lg border px-4 py-3 text-sm ${
                  error
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-stone-200 bg-stone-50 text-stone-700"
                }`}
              >
                {error || message}
              </div>
            ) : null}

            <form action={signInAction} className="space-y-4">
              <label className="grid gap-1.5 text-sm font-medium text-stone-700">
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={fieldClassName}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-stone-700">
                <span className="flex items-center justify-between gap-3"><span>Password</span><Link href="/forgot-password" className="font-normal text-stone-600 underline-offset-4 hover:text-stone-950 hover:underline">Forgot password?</Link></span>
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  className={fieldClassName}
                />
              </label>
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </form>

            <p className="text-sm text-stone-600">
              New here?{" "}
              <Link href="/sign-up" className="font-medium text-stone-950 underline-offset-4 hover:underline">
                Create an account
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
