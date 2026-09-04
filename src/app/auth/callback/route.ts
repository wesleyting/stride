import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, requestUrl.origin));
  }

  const errorPath = next === "/reset-password"
    ? "/forgot-password?error=That%20reset%20link%20is%20invalid%20or%20has%20expired."
    : `/sign-in?error=${encodeURIComponent("Could not complete that email link.")}&next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(new URL(errorPath, requestUrl.origin));
}

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}
