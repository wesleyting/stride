import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

type UserResult = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User | null;
};

export async function requireUser() {
  const result = await getUser();

  if (!result.user) {
    redirect("/sign-in");
  }

  return result as { supabase: UserResult["supabase"]; user: User };
}

export async function getUser(): Promise<UserResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (
    error &&
    error.name !== "AuthSessionMissingError" &&
    !error.message.includes("Auth session missing")
  ) {
    throw error;
  }

  return { supabase, user: data.user ?? null };
}
