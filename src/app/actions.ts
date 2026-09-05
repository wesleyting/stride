"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site";
import { safeReturnPath } from "@/lib/return-path";
import { serializePracticeTags } from "@/lib/practice-tags";
import {
  clampRating,
  ensureSeedData,
  slugify,
  titleCaseSongName,
} from "@/lib/stride";

export type MutationState = {
  success: boolean;
  error: string | null;
};

const authSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
});

const emailSchema = z.object({ email: z.string().trim().email("Enter a valid email address.") });
const newPasswordSchema = z.object({
  password: z.string().min(8, "Use at least 8 characters."),
  confirmPassword: z.string(),
}).refine((values) => values.password === values.confirmPassword, { message: "The passwords do not match.", path: ["confirmPassword"] });

const activitySchema = z.object({
  name: z.string().trim().min(2, "Activity names need at least 2 characters.").max(60),
  kind: z.enum(["practice", "journal", "fitness", "projects"]),
  description: z
    .string()
    .trim()
    .max(120, "Keep the description short.")
    .optional()
    .or(z.literal("")),
});

const difficultySchema = z.coerce.number().min(0.5).max(5).refine(
  (value) => Number.isInteger(value * 2),
  "Choose a difficulty in half-star steps.",
);

const itemSchema = z.object({
  name: z.string().trim().min(2, "Item names need at least 2 characters.").max(60),
  difficulty: difficultySchema,
  isPublic: z.boolean().default(false),
  youtubeUrl: z.string().trim().max(500).refine(
    (value) => !value || /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(value),
    "Use a YouTube or youtu.be link.",
  ).optional().or(z.literal("")),
  tuning: z.enum(["standard", "half-step-down", "whole-step-down", "drop-d", "double-drop-d", "dadgad", "open-c", "open-d", "open-e", "open-g"]).default("standard"),
  capo: z.preprocess(
    (value) => value === "" || value === "none" || value === null ? null : Number(value),
    z.number().int().min(1).max(12).nullable(),
  ),
});

const practiceSchema = z.object({
  note: z.string().trim().max(500),
  rating: z.preprocess(
    (value) => value === "" || value === null ? null : Number(value),
    z.number().int().min(1).max(10).nullable(),
  ),
  practicePart: z.string().trim().max(160, "Keep the practice tags under 160 characters.").optional().or(z.literal("")),
  youtubeUrl: z.string().trim().max(500).refine(
    (value) => !value || /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(value),
    "Use a YouTube or youtu.be link.",
  ).optional().or(z.literal("")),
  activitySlug: z.string().trim().min(1),
  itemSlug: z.string().trim().min(1),
}).refine(
  (value) => Boolean(value.note || value.rating !== null || value.practicePart),
  { message: "Add a note, session rating, or what you worked on." },
);

const songWorkspaceSchema = z.object({
  itemId: z.string().uuid(),
  itemSlug: z.string().trim().min(1),
  youtubeUrl: z
    .string()
    .trim()
    .max(500)
    .refine(
      (value) => !value || /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(value),
      "Use a YouTube or youtu.be link.",
    ),
});

const editSongSchema = itemSchema.extend({
  itemId: z.string().uuid(),
  itemSlug: z.string().trim().min(1),
  activitySlug: z.string().trim().min(1),
});

const timedPracticeSchema = z.object({
  sessionId: z.string().uuid(),
  itemId: z.string().uuid(),
  itemSlug: z.string().trim().min(1),
  durationSeconds: z.coerce.number().int().min(1).max(43200),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  rating: z.number().int().min(1).max(10).nullable().optional(),
  practicePart: z.string().trim().max(160).optional().or(z.literal("")),
});

const editPracticeSchema = z.object({
  entryId: z.string().uuid(),
  itemSlug: z.string().trim().min(1),
  note: z.string().trim().max(500),
  rating: z.preprocess(
    (value) => value === "" || value === null ? null : Number(value),
    z.number().int().min(1).max(10).nullable(),
  ),
  practicePart: z.string().trim().max(160).optional().or(z.literal("")),
});

const songVisibilitySchema = z.object({
  itemId: z.string().uuid(),
  itemSlug: z.string().trim().min(1),
  isPublic: z.boolean(),
});

const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Use at least 3 characters for your username.")
    .max(30)
    .regex(/^[a-z0-9][a-z0-9_-]*$/, "Use lowercase letters, numbers, underscores, or hyphens."),
  displayName: z.string().trim().min(2, "Add a display name.").max(50),
  bio: z.string().trim().max(160, "Keep your bio under 160 characters."),
  isPublic: z.boolean(),
  shareSongLibrary: z.boolean(),
  sharePracticeLogs: z.boolean(),
  shareSongResources: z.boolean(),
});

const activityDescriptionFallbacks: Record<
  z.infer<typeof activitySchema>["kind"],
  string
> = {
  practice: "Practicing regularly",
  journal: "Journal & reflection",
  fitness: "Building endurance",
  projects: "Ongoing work",
};

function errorQuery(message: string) {
  return `?error=${encodeURIComponent(message)}`;
}

function authRedirectPath(path: "/sign-in" | "/sign-up", next: string, key: "error" | "message", message: string) {
  const params = new URLSearchParams({ [key]: message, next });
  return `${path}?${params.toString()}`;
}

function mutationError(message: string): MutationState {
  return { success: false, error: message };
}

function mutationSuccess(): MutationState {
  return { success: true, error: null };
}

async function getSignedInUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return { supabase, user: data.user };
}

export async function signInAction(formData: FormData) {
  const next = safeReturnPath(formData.get("next"));
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(authRedirectPath("/sign-in", next, "error", parsed.error.issues[0]?.message ?? "Check your email and password."));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    redirect(authRedirectPath("/sign-in", next, "error", "Could not sign you in. Check your email and password."));
  }

  redirect(next);
}

export async function startGuestAction(formData: FormData) {
  const next = safeReturnPath(formData.get("next"));
  const supabase = await createClient();
  const { data: current } = await supabase.auth.getUser();

  if (!current.user) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      redirect(`/?guest=unavailable`);
    }
  }

  redirect(next);
}

export async function signUpAction(formData: FormData) {
  const next = safeReturnPath(formData.get("next"));
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(authRedirectPath("/sign-up", next, "error", parsed.error.issues[0]?.message ?? "Check your email and password."));
  }

  const supabase = await createClient();
  const emailRedirect = new URL("/auth/callback", getSiteUrl());
  emailRedirect.searchParams.set("next", next);
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: emailRedirect.toString() },
  });

  if (error) {
    redirect(authRedirectPath("/sign-up", next, "error", error.message));
  }

  if (data.session) {
    redirect(next);
  }

  redirect(authRedirectPath("/sign-up", next, "message", "Check your inbox to confirm your email, then Stride will bring you back to where you left off."));
}

export async function beginGuestUpgradeAction(formData: FormData) {
  const next = safeReturnPath(formData.get("next"));
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    redirect(authRedirectPath("/sign-up", next, "error", parsed.error.issues[0]?.message ?? "Enter a valid email address."));
  }

  const { supabase, user } = await getSignedInUser();
  if (!user) redirect(authRedirectPath("/sign-up", next, "error", "Start as a guest before saving your progress."));
  if (!user.is_anonymous) redirect(next);

  const finishParams = new URLSearchParams({ next });
  const emailRedirect = new URL("/auth/callback", getSiteUrl());
  emailRedirect.searchParams.set("next", `/finish-sign-up?${finishParams.toString()}`);
  const { data, error } = await supabase.auth.updateUser(
    { email: parsed.data.email, data: { ...user.user_metadata, stride_account_setup_pending: true } },
    { emailRedirectTo: emailRedirect.toString() },
  );

  if (error) {
    const message = error.message.toLowerCase().includes("already")
      ? "That email already has an account. Guest progress cannot be merged into an existing account yet."
      : error.message;
    redirect(authRedirectPath("/sign-up", next, "error", message));
  }

  if (data.user && !data.user.is_anonymous) {
    redirect(`/finish-sign-up?${finishParams.toString()}`);
  }

  redirect(authRedirectPath("/sign-up", next, "message", "Check your inbox to confirm your email. Your guest songs will stay here."));
}

export async function finishGuestUpgradeAction(formData: FormData) {
  const next = safeReturnPath(formData.get("next"));
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const params = new URLSearchParams({ next, error: parsed.error.issues[0]?.message ?? "Check your password." });
    redirect(`/finish-sign-up?${params.toString()}`);
  }

  const { supabase, user } = await getSignedInUser();
  if (!user || user.is_anonymous) {
    redirect(authRedirectPath("/sign-up", next, "error", "Confirm your email before choosing a password."));
  }
  if (user.user_metadata?.stride_account_setup_pending !== true) redirect(next);

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
    data: { ...user.user_metadata, stride_account_setup_pending: false },
  });
  if (error) {
    const params = new URLSearchParams({ next, error: error.message });
    redirect(`/finish-sign-up?${params.toString()}`);
  }

  redirect(next);
}

export async function signOutAction() {
  const { supabase } = await getSignedInUser();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordResetAction(formData: FormData) {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) redirect(`/forgot-password${errorQuery(parsed.error.issues[0]?.message ?? "Enter a valid email address.")}`);

  const supabase = await createClient();
  const redirectTo = new URL("/auth/callback?next=/reset-password", getSiteUrl()).toString();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });
  if (error) redirect(`/forgot-password${errorQuery(error.message)}`);

  redirect(`/forgot-password?message=${encodeURIComponent("If an account exists for that email, a password reset link is on its way.")}`);
}

export async function updatePasswordAction(formData: FormData) {
  const parsed = newPasswordSchema.safeParse({ password: formData.get("password"), confirmPassword: formData.get("confirmPassword") });
  if (!parsed.success) redirect(`/reset-password${errorQuery(parsed.error.issues[0]?.message ?? "Check the new password.")}`);

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/forgot-password${errorQuery("That reset link is invalid or has expired. Request a new one.")}`);

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) redirect(`/reset-password${errorQuery(error.message)}`);
  await supabase.auth.signOut();
  redirect(`/sign-in?message=${encodeURIComponent("Password updated. Sign in with your new password.")}`);
}

export async function createActivityAction(
  _previousState: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const { supabase, user } = await getSignedInUser();
  if (!user) {
    return mutationError("You need to sign in first.");
  }

  const parsed = activitySchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    description: formData.get("description") ?? "",
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return mutationError(firstIssue?.message ?? "Check the activity details.");
  }

  const slug = slugify(parsed.data.name);

  const { error } = await supabase.from("activities").insert({
    user_id: user.id,
    name: parsed.data.name,
    slug,
    kind: parsed.data.kind,
    description:
      parsed.data.description?.trim() ||
      activityDescriptionFallbacks[parsed.data.kind],
    sort_order: 999,
  });

  if (error) {
    return mutationError(error.message);
  }

  revalidatePath("/");
  return mutationSuccess();
}

export async function createItemAction(
  _previousState: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const { supabase, user } = await getSignedInUser();
  if (!user) {
    return mutationError("You need to sign in first.");
  }

  const parsed = itemSchema.safeParse({
    name: formData.get("name"),
    difficulty: formData.get("difficulty"),
    isPublic: formData.get("isPublic") === "true",
    youtubeUrl: formData.get("youtubeUrl") ?? "",
    tuning: formData.get("tuning") ?? "standard",
    capo: formData.get("capo") ?? "",
  });

  const activitySlug = String(formData.get("activitySlug") ?? "").trim();
  const createdFromHome = formData.get("createdFrom") === "home";

  if (!parsed.success || !activitySlug) {
    const firstIssue = parsed.success ? null : parsed.error.issues[0];
    return mutationError(
      firstIssue?.message ?? "Choose an activity and give the item a name.",
    );
  }

  if (user.is_anonymous && parsed.data.isPublic) {
    return mutationError("Create an account before sharing a song publicly.");
  }

  let { data: activity, error: activityError } = await supabase
    .from("activities")
    .select("id, slug")
    .eq("user_id", user.id)
    .eq("slug", activitySlug)
    .maybeSingle();

  if ((!activity || activityError) && activitySlug === "guitar") {
    const created = await supabase
      .from("activities")
      .insert({
        user_id: user.id,
        name: "Guitar",
        slug: "guitar",
        kind: "practice",
        description: "Songs and practice notes",
        sort_order: 0,
      })
      .select("id, slug")
      .single();
    activity = created.data;
    activityError = created.error;
  }

  if (activityError || !activity) {
    return mutationError("That activity could not be found.");
  }

  const normalizedName = titleCaseSongName(parsed.data.name);
  const slug = slugify(normalizedName);

  const { error } = await supabase.from("items").insert({
    user_id: user.id,
    activity_id: activity.id,
    name: normalizedName,
    slug,
    difficulty: parsed.data.difficulty,
    is_public: parsed.data.isPublic,
    ...(parsed.data.youtubeUrl ? { youtube_url: parsed.data.youtubeUrl } : {}),
    tuning: parsed.data.tuning || "standard",
    capo: parsed.data.capo,
    sort_order: 999,
  });

  if (error) {
    return mutationError(error.code === "42703" || error.code === "PGRST204" ? "Run migration 0015_song_setup.sql before saving tuning and capo." : error.message);
  }

  revalidatePath(`/${activitySlug}`);
  revalidatePath("/");
  revalidatePath("/songs");
  revalidatePath(`/songs/${slug}`);
  redirect(`/songs/${slug}${createdFromHome ? "?from=home" : ""}`);
}

export async function logPracticeAction(
  _previousState: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const { supabase, user } = await getSignedInUser();
  if (!user) {
    return mutationError("You need to sign in first.");
  }

  const parsed = practiceSchema.safeParse({
    note: formData.get("note"),
    rating: formData.get("rating"),
    practicePart: formData.get("practicePart") ?? "",
    youtubeUrl: formData.get("youtubeUrl") ?? "",
    activitySlug: formData.get("activitySlug"),
    itemSlug: formData.get("itemSlug"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Add something about this practice before saving.";
    return mutationError(message);
  }

  const { data: activity, error: activityError } = await supabase
    .from("activities")
    .select("id, slug")
    .eq("user_id", user.id)
    .eq("slug", parsed.data.activitySlug)
    .single();

  if (activityError || !activity) {
    return mutationError("That activity could not be found.");
  }

  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("id, activity_id, slug")
    .eq("user_id", user.id)
    .eq("activity_id", activity.id)
    .eq("slug", parsed.data.itemSlug)
    .single();

  if (itemError || !item) {
    return mutationError("That item could not be found.");
  }

  const normalizedNote = parsed.data.note.trim();
  const normalizedPracticeParts = serializePracticeTags(parsed.data.practicePart ?? "");

  const { error: entryError } = await supabase.from("entries").insert({
    user_id: user.id,
    activity_id: activity.id,
    item_id: item.id,
    content: normalizedNote,
    rating: parsed.data.rating === null ? null : clampRating(parsed.data.rating, 10),
    practice_part: normalizedPracticeParts || null,
  });

  if (entryError) {
    return mutationError(entryError.message);
  }

  if (parsed.data.youtubeUrl) {
    const { error: updateError } = await supabase
      .from("items")
      .update({ youtube_url: parsed.data.youtubeUrl })
      .eq("id", item.id)
      .eq("user_id", user.id);

    if (updateError) return mutationError(updateError.message);
  }

  revalidatePath(`/${parsed.data.activitySlug}`);
  revalidatePath(`/${parsed.data.activitySlug}/${parsed.data.itemSlug}`);
  revalidatePath("/");
  revalidatePath("/songs");
  revalidatePath(`/songs/${parsed.data.itemSlug}`);
  return mutationSuccess();
}

export async function saveTimedPracticeAction(input: {
  sessionId: string;
  itemId: string;
  itemSlug: string;
  durationSeconds: number;
  note?: string;
  rating?: number | null;
  practicePart?: string;
}): Promise<MutationState> {
  const { supabase, user } = await getSignedInUser();
  if (!user) return mutationError("You need to sign in first.");

  const parsed = timedPracticeSchema.safeParse(input);
  if (!parsed.success) return mutationError("That timed session could not be saved.");

  const itemResult = await supabase
    .from("items")
    .select("id, activity_id")
    .eq("id", parsed.data.itemId)
    .eq("slug", parsed.data.itemSlug)
    .eq("user_id", user.id)
    .single();

  if (itemResult.error || !itemResult.data) {
    return mutationError("That song could not be found.");
  }

  const { error } = await supabase.from("entries").insert({
    user_id: user.id,
    activity_id: itemResult.data.activity_id,
    item_id: itemResult.data.id,
    content: parsed.data.note?.trim() || "Timed practice session",
    rating: parsed.data.rating ?? null,
    practice_part: serializePracticeTags(parsed.data.practicePart ?? "") || null,
    duration_seconds: parsed.data.durationSeconds,
    client_session_id: parsed.data.sessionId,
  });

  if (error) {
    if (error.code === "23505") return mutationSuccess();
    return mutationError(
      error.code === "42703" || error.code === "PGRST204"
        ? "Run migrations 0007 and 0017 before saving timed sessions."
        : error.message,
    );
  }

  revalidatePath("/");
  revalidatePath("/songs");
  revalidatePath(`/songs/${parsed.data.itemSlug}`);
  return mutationSuccess();
}

export async function editPracticeEntryAction(
  _previousState: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const { supabase, user } = await getSignedInUser();
  if (!user) return mutationError("You need to sign in first.");

  const parsed = editPracticeSchema.safeParse({
    entryId: formData.get("entryId"),
    itemSlug: formData.get("itemSlug"),
    note: formData.get("note") ?? "",
    rating: formData.get("rating") ?? "",
    practicePart: formData.get("practicePart") ?? "",
  });
  if (!parsed.success) return mutationError(parsed.error.issues[0]?.message ?? "Check the practice details.");

  const item = await supabase
    .from("items")
    .select("id")
    .eq("user_id", user.id)
    .eq("slug", parsed.data.itemSlug)
    .single();
  if (item.error || !item.data) return mutationError("That song could not be found.");

  const { error } = await supabase
    .from("entries")
    .update({
      content: parsed.data.note || "Practice session",
      rating: parsed.data.rating,
      practice_part: serializePracticeTags(parsed.data.practicePart ?? "") || null,
    })
    .eq("id", parsed.data.entryId)
    .eq("item_id", item.data.id)
    .eq("user_id", user.id);
  if (error) return mutationError(error.message);

  revalidatePath("/");
  revalidatePath("/songs");
  revalidatePath(`/songs/${parsed.data.itemSlug}`);
  revalidatePath("/community");
  return mutationSuccess();
}

export async function setSongVisibilityAction(input: {
  itemId: string;
  itemSlug: string;
  isPublic: boolean;
}): Promise<MutationState> {
  const { supabase, user } = await getSignedInUser();
  if (!user) return mutationError("You need to sign in first.");
  const parsed = songVisibilitySchema.safeParse(input);
  if (!parsed.success) return mutationError("That song could not be shared.");
  if (user.is_anonymous && parsed.data.isPublic) {
    return mutationError("Create an account before sharing a song publicly.");
  }

  const { error } = await supabase
    .from("items")
    .update({ is_public: parsed.data.isPublic })
    .eq("id", parsed.data.itemId)
    .eq("slug", parsed.data.itemSlug)
    .eq("user_id", user.id);
  if (error) return mutationError(
    error.code === "42703" || error.code === "PGRST204"
      ? "Run migration 0011_public_song_links.sql before sharing songs."
      : error.message,
  );

  revalidatePath(`/songs/${parsed.data.itemSlug}`);
  revalidatePath("/settings");
  revalidatePath("/community");
  return mutationSuccess();
}

export async function saveProfileAction(
  _previousState: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const { supabase, user } = await getSignedInUser();
  if (!user) return mutationError("You need to sign in first.");
  if (user.is_anonymous) return mutationError("Create an account before publishing a profile.");

  const parsed = profileSchema.safeParse({
    username: formData.get("username"),
    displayName: formData.get("displayName"),
    bio: formData.get("bio") ?? "",
    isPublic: formData.get("isPublic") === "on",
    shareSongLibrary: formData.get("shareSongLibrary") === "on",
    sharePracticeLogs: formData.get("sharePracticeLogs") === "on",
    shareSongResources: formData.get("shareSongResources") === "on",
  });

  if (!parsed.success) {
    return mutationError(parsed.error.issues[0]?.message ?? "Check your profile details.");
  }

  const { error } = await supabase.from("profiles").upsert({
    user_id: user.id,
    username: parsed.data.username,
    display_name: parsed.data.displayName,
    bio: parsed.data.bio,
    is_public: parsed.data.isPublic,
    share_song_library: parsed.data.shareSongLibrary,
    share_practice_logs: parsed.data.sharePracticeLogs,
    share_song_resources: parsed.data.shareSongResources,
  });

  if (error) {
    return mutationError(
      error.code === "42703" || error.code === "PGRST204"
        ? "Run migration 0008_public_profile_sharing.sql before saving sharing settings."
        : error.code === "42P01"
        ? "Run migration 0007_practice_time_and_public_profiles.sql first."
        : error.code === "23505"
          ? "That username is already taken."
          : error.message,
    );
  }

  revalidatePath("/community");
  revalidatePath("/settings");
  revalidatePath(`/people/${parsed.data.username}`);
  return mutationSuccess();
}

export async function updateItemDifficultyAction(formData: FormData) {
  const { supabase, user } = await getSignedInUser();
  if (!user) return mutationError("You need to sign in first.");

  const parsed = z.object({
    itemId: z.string().uuid(),
    itemSlug: z.string().trim().min(1),
    activitySlug: z.string().trim().min(1),
    difficulty: difficultySchema,
  }).safeParse({
    itemId: formData.get("itemId"),
    itemSlug: formData.get("itemSlug"),
    activitySlug: formData.get("activitySlug"),
    difficulty: formData.get("difficulty"),
  });

  if (!parsed.success) return mutationError("Choose a difficulty from 0.5 to 5 in half-star steps.");

  const { error } = await supabase
    .from("items")
    .update({ difficulty: parsed.data.difficulty })
    .eq("id", parsed.data.itemId)
    .eq("user_id", user.id);

  if (error) return mutationError(error.message);

  revalidatePath(`/${parsed.data.activitySlug}`);
  revalidatePath(`/${parsed.data.activitySlug}/${parsed.data.itemSlug}`);
  revalidatePath("/");
  revalidatePath("/songs");
  revalidatePath(`/songs/${parsed.data.itemSlug}`);
  return mutationSuccess();
}

export async function toggleFavoriteAction(
  itemId: string,
  nextValue: boolean,
): Promise<MutationState> {
  const { supabase, user } = await getSignedInUser();
  if (!user) return mutationError("You need to sign in first.");

  const parsed = z.object({ itemId: z.string().uuid(), nextValue: z.boolean() }).safeParse({
    itemId,
    nextValue,
  });
  if (!parsed.success) return mutationError("That song could not be updated.");

  let pinPosition: number | null = null;
  if (parsed.data.nextValue) {
    const lastPin = await supabase
      .from("items")
      .select("pin_position")
      .eq("user_id", user.id)
      .eq("is_favorite", true)
      .order("pin_position", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!lastPin.error) pinPosition = Number(lastPin.data?.pin_position ?? -1) + 1;
  }

  const update = await supabase
    .from("items")
    .update({ is_favorite: parsed.data.nextValue, pin_position: pinPosition })
    .eq("id", parsed.data.itemId)
    .eq("user_id", user.id);

  if (update.error?.code === "42703") {
    const fallback = await supabase.from("items").update({ is_favorite: parsed.data.nextValue }).eq("id", parsed.data.itemId).eq("user_id", user.id);
    if (fallback.error) return mutationError(fallback.error.message);
  } else if (update.error) {
    return mutationError(
      update.error.message,
    );
  }

  revalidatePath("/");
  revalidatePath("/songs");
  return mutationSuccess();
}

export async function setHomeSongsAction(
  _previousState: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const { supabase, user } = await getSignedInUser();
  if (!user) return mutationError("You need to sign in first.");

  const rawIds = String(formData.get("itemIds") ?? "");
  const parsed = z.array(z.string().uuid()).max(12).safeParse(rawIds ? rawIds.split(",") : []);
  if (!parsed.success) return mutationError("Those Home songs could not be saved.");

  const activity = await supabase.from("activities").select("id").eq("user_id", user.id).eq("slug", "guitar").maybeSingle();
  if (activity.error || !activity.data) return mutationError("Guitar could not be found.");
  const activityId = activity.data.id;

  const clearResult = await supabase.from("items").update({ is_favorite: false, pin_position: null }).eq("user_id", user.id).eq("activity_id", activityId);
  if (clearResult.error) return mutationError(clearResult.error.code === "42703" ? "Run migration 0006_guitar_workspace.sql first." : clearResult.error.message);

  if (parsed.data.length) {
    const updates = await Promise.all(parsed.data.map((id, pinPosition) => supabase
      .from("items")
      .update({ is_favorite: true, pin_position: pinPosition })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("activity_id", activityId)));
    const failed = updates.find((result) => result.error);
    if (failed?.error) return mutationError(failed.error.code === "42703" ? "Run migration 0013_pinned_song_order.sql before reordering pins." : failed.error.message);
  }

  revalidatePath("/");
  revalidatePath("/songs");
  return mutationSuccess();
}

export async function updateSongWorkspaceAction(
  _previousState: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const { supabase, user } = await getSignedInUser();
  if (!user) return mutationError("You need to sign in first.");

  const parsed = songWorkspaceSchema.safeParse({
    itemId: formData.get("itemId"),
    itemSlug: formData.get("itemSlug"),
    youtubeUrl: formData.get("youtubeUrl") ?? "",
  });
  if (!parsed.success) {
    return mutationError(parsed.error.issues[0]?.message ?? "Check the song details.");
  }

  const { error } = await supabase
    .from("items")
    .update({
      youtube_url: parsed.data.youtubeUrl,
    })
    .eq("id", parsed.data.itemId)
    .eq("user_id", user.id);

  if (error) {
    return mutationError(
      error.code === "42703"
        ? "Run migration 0006_guitar_workspace.sql before saving song resources."
        : error.message,
    );
  }

  revalidatePath("/");
  revalidatePath("/songs");
  revalidatePath(`/songs/${parsed.data.itemSlug}`);
  revalidatePath(`/guitar/${parsed.data.itemSlug}`);
  return mutationSuccess();
}

export async function updateItemAction(
  _previousState: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const { supabase, user } = await getSignedInUser();
  if (!user) {
    return mutationError("You need to sign in first.");
  }

  const parsed = editSongSchema.safeParse({
    itemId: formData.get("itemId"),
    itemSlug: formData.get("itemSlug"),
    activitySlug: formData.get("activitySlug"),
    name: formData.get("name"),
    difficulty: formData.get("difficulty"),
    youtubeUrl: formData.get("youtubeUrl") ?? "",
    tuning: formData.get("tuning") ?? "standard",
    capo: formData.get("capo") ?? "",
  });
  if (!parsed.success) return mutationError(parsed.error.issues[0]?.message ?? "Check the song details.");

  const name = titleCaseSongName(parsed.data.name);

  const { error } = await supabase
    .from("items")
    .update({
      name,
      difficulty: parsed.data.difficulty,
      youtube_url: parsed.data.youtubeUrl,
      tuning: parsed.data.tuning || "standard",
      capo: parsed.data.capo,
    })
    .eq("id", parsed.data.itemId)
    .eq("user_id", user.id);

  if (error) {
    return mutationError(error.code === "42703" || error.code === "PGRST204" ? "Run migration 0015_song_setup.sql before saving tuning and capo." : error.message);
  }

  revalidatePath(`/${parsed.data.activitySlug}`);
  revalidatePath(`/${parsed.data.activitySlug}/${parsed.data.itemSlug}`);
  revalidatePath("/");
  revalidatePath("/songs");
  revalidatePath(`/songs/${parsed.data.itemSlug}`);
  return mutationSuccess();
}

export async function deleteItemAction(
  _previousState: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const { supabase, user } = await getSignedInUser();
  if (!user) return mutationError("You need to sign in first.");

  const parsed = z.object({
    itemId: z.string().uuid(),
    activitySlug: z.string().trim().min(1),
  }).safeParse({
    itemId: formData.get("itemId"),
    activitySlug: formData.get("activitySlug"),
  });

  if (!parsed.success) return mutationError("That item could not be deleted.");

  const resourceResult = await supabase
    .from("song_resources")
    .select("storage_path")
    .eq("user_id", user.id)
    .eq("item_id", parsed.data.itemId);

  if (!resourceResult.error && resourceResult.data.length > 0) {
    const storageResult = await supabase.storage
      .from("song-resources")
      .remove(resourceResult.data.map((resource) => resource.storage_path));
    if (storageResult.error) return mutationError(storageResult.error.message);
  }

  const { error: entryError } = await supabase
    .from("entries")
    .delete()
    .eq("user_id", user.id)
    .eq("item_id", parsed.data.itemId);

  if (entryError) return mutationError(entryError.message);

  const { error: itemError } = await supabase
    .from("items")
    .delete()
    .eq("user_id", user.id)
    .eq("id", parsed.data.itemId);

  if (itemError) return mutationError(itemError.message);

  revalidatePath(`/${parsed.data.activitySlug}`);
  revalidatePath("/");
  revalidatePath("/songs");
  return mutationSuccess();
}

export async function bootstrapDataIfNeeded() {
  const { supabase, user } = await getSignedInUser();

  if (!user) {
    return;
  }

  await ensureSeedData(supabase, user.id);
}
