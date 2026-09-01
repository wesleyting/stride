import { z } from "zod";

const publicSupabaseEnvSchema = z.object({
  url: z.string().url(),
  publishableKey: z.string().min(20),
});

export function getSupabasePublicEnv() {
  const result = publicSupabaseEnvSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  if (!result.success) {
    throw new Error("Missing or invalid NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variables.");
  }

  return result.data;
}
