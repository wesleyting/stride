import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

type UserResult = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User | null;
};

export async function requireUser(next = "/") {
  const result = await getUser();

  if (!result.user) {
    const params = new URLSearchParams({ next });
    redirect(`/sign-in?${params.toString()}`);
  }

  if (isAccountSetupPending(result.user)) {
    const params = new URLSearchParams({ next });
    redirect(`/finish-sign-up?${params.toString()}`);
  }

  return result as { supabase: UserResult["supabase"]; user: User };
}

export function isAccountSetupPending(user: User) {
  return user.is_anonymous !== true && user.user_metadata?.stride_account_setup_pending === true;
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
