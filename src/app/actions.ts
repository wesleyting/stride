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
  folder?: { id: string; name: string } | null;
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

const optionalDifficultySchema = z.preprocess(
  (value) => value === "" || value === null ? null : Number(value),
  z.number().min(0.5).max(5).refine((value) => Number.isInteger(value * 2), "Choose difficulty in half-star steps.").nullable(),
);

const optionalFolderIdSchema = z.preprocess(
  (value) => value === "" || value === "uncategorized" || value === null ? null : value,
  z.string().uuid().nullable(),
);

const referenceUrlSchema = z.string().trim().max(500).refine((value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}, "Use a complete http or https link.");

const referenceUrlsSchema = z.array(referenceUrlSchema).max(10, "Keep reference links to 10 or fewer.").transform((urls) => Array.from(new Set(urls.filter(Boolean))));
const guitarTuningSchema = z.enum(["standard", "half-step-down", "whole-step-down", "drop-d", "double-drop-d", "dadgad", "open-c", "open-d", "open-e", "open-g"]);

const itemSchema = z.object({
  name: z.string().trim().min(2, "Item names need at least 2 characters.").max(60),
  difficulty: optionalDifficultySchema,
  folderId: optionalFolderIdSchema,
  isPublic: z.boolean().default(false),
  referenceUrls: referenceUrlsSchema,
  tuning: guitarTuningSchema.default("standard"),
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
  youtubeUrl: referenceUrlSchema.optional().or(z.literal("")),
  activitySlug: z.string().trim().min(1),
  itemSlug: z.string().trim().min(1),
}).refine(
  (value) => Boolean(value.note || value.rating !== null || value.practicePart),
  { message: "Add a note, session rating, or what you worked on." },
);

const songWorkspaceSchema = z.object({
  itemId: z.string().uuid(),
  itemSlug: z.string().trim().min(1),
  referenceUrls: referenceUrlsSchema,
});

const folderSchema = z.object({
  activitySlug: z.string().trim().min(1),
  name: z.string().trim().min(1, "Give the folder a name.").max(40, "Keep folder names under 40 characters."),
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
  durationSeconds: z.coerce.number().int().min(1).max(14400),
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
  defaultSongPublic: z.boolean(),
  defaultResourcePublic: z.boolean(),
  defaultTuning: guitarTuningSchema,
});

const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE", { error: "Type DELETE to confirm." }),
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

function captchaToken(formData: FormData) {
  const token = formData.get("cf-turnstile-response");
  return typeof token === "string" && token ? token : undefined;
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
  const { error } = await supabase.auth.signInWithPassword({
    ...parsed.data,
    options: { captchaToken: captchaToken(formData) },
  });

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
    const { error } = await supabase.auth.signInAnonymously({
      options: { captchaToken: captchaToken(formData) },
    });
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
    options: { emailRedirectTo: emailRedirect.toString(), captchaToken: captchaToken(formData) },
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

  redirect(authRedirectPath("/sign-up", next, "message", "Check your email to finish signing up."));
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

export async function deleteAccountAction(
  _previousState: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const parsed = deleteAccountSchema.safeParse({ confirmation: formData.get("confirmation") });
  if (!parsed.success) return mutationError("Type DELETE to confirm.");

  const { supabase, user } = await getSignedInUser();
  if (!user) return mutationError("Your session has expired. Sign in and try again.");

  const preflight = await supabase.rpc("delete_stride_account", { dry_run: true });
  if (preflight.error) {
    const message = preflight.error.code === "PGRST202"
      ? "Run migration 0021_account_deletion.sql before deleting accounts."
      : "Stride could not verify account deletion. Try again.";
    return mutationError(message);
  }

  const resources = await supabase
    .from("song_resources")
    .select("storage_path")
    .eq("user_id", user.id);
  if (resources.error && resources.error.code !== "42P01") {
    return mutationError("Stride could not prepare your uploaded files for deletion.");
  }

  const paths = (resources.data ?? []).map((resource) => resource.storage_path).filter(Boolean);
  if (paths.length > 0) {
    const removed = await supabase.storage.from("song-resources").remove(paths);
    if (removed.error) return mutationError("Stride could not delete your uploaded files. Try again.");
  }

  const deleted = await supabase.rpc("delete_stride_account", { dry_run: false });
  if (deleted.error) {
    return mutationError("Stride could not delete your account. Try again.");
  }

  await supabase.auth.signOut({ scope: "local" });
  redirect("/?notice=account-deleted");
}

export async function requestPasswordResetAction(formData: FormData) {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) redirect(`/forgot-password${errorQuery(parsed.error.issues[0]?.message ?? "Enter a valid email address.")}`);

  const supabase = await createClient();
  const redirectTo = new URL("/auth/callback?next=/reset-password", getSiteUrl()).toString();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo,
    captchaToken: captchaToken(formData),
  });
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
    folderId: formData.get("folderId") ?? "",
    isPublic: formData.get("isPublic") === "true",
    referenceUrls: formData.getAll("referenceUrl"),
    tuning: formData.get("tuning") ?? "standard",
    capo: formData.get("capo") ?? "",
  });

  const activitySlug = String(formData.get("activitySlug") ?? "").trim();

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

  if (parsed.data.folderId) {
    const folder = await supabase.from("song_folders").select("id").eq("id", parsed.data.folderId).eq("user_id", user.id).eq("activity_id", activity.id).maybeSingle();
    if (folder.error || !folder.data) return mutationError("That folder is no longer available.");
  }

  let lastSongQuery = supabase.from("items").select("sort_order").eq("user_id", user.id).eq("activity_id", activity.id).eq("is_archived", false);
  lastSongQuery = parsed.data.folderId ? lastSongQuery.eq("folder_id", parsed.data.folderId) : lastSongQuery.is("folder_id", null);
  const lastSong = await lastSongQuery.order("sort_order", { ascending: false }).limit(1).maybeSingle();

  const { data: createdItem, error } = await supabase.from("items").insert({
    user_id: user.id,
    activity_id: activity.id,
    name: normalizedName,
    slug,
    difficulty: parsed.data.difficulty,
    folder_id: parsed.data.folderId,
    is_public: parsed.data.isPublic,
    youtube_url: parsed.data.referenceUrls[0] ?? "",
    tuning: parsed.data.tuning || "standard",
    capo: parsed.data.capo,
    sort_order: (lastSong.data?.sort_order ?? -1) + 1,
  }).select("id").single();

  if (error) {
    return mutationError(error.code === "42703" || error.code === "PGRST204" || error.code === "23502" ? "Run migration 0022_song_folders_and_optional_difficulty.sql before saving this song." : error.message);
  }

  const references = await supabase.rpc("replace_song_references", { target_item_id: createdItem.id, reference_urls: parsed.data.referenceUrls });
  if (references.error) {
    await supabase.from("items").delete().eq("id", createdItem.id).eq("user_id", user.id);
    return mutationError("Run migration 0023_folder_order_and_song_references.sql before saving reference links.");
  }

  revalidatePath(`/${activitySlug}`);
  revalidatePath("/");
  revalidatePath("/songs");
  revalidatePath(`/songs/${slug}`);
  redirect(`/songs?added=${encodeURIComponent(slug)}&notice=song-created`);
}

export async function createSongFolderAction(
  _previousState: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const { supabase, user } = await getSignedInUser();
  if (!user) return mutationError("You need to sign in first.");

  const parsed = folderSchema.safeParse({ activitySlug: formData.get("activitySlug"), name: formData.get("name") });
  if (!parsed.success) return mutationError(parsed.error.issues[0]?.message ?? "Check the folder name.");

  let activity = await supabase.from("activities").select("id").eq("user_id", user.id).eq("slug", parsed.data.activitySlug).maybeSingle();
  if (!activity.data && parsed.data.activitySlug === "guitar") {
    const created = await supabase.from("activities").insert({ user_id: user.id, name: "Guitar", slug: "guitar", kind: "practice", description: "Songs and practice notes", sort_order: 0 }).select("id").single();
    activity = created;
  }
  if (activity.error || !activity.data) return mutationError("That activity could not be found.");

  const lastFolder = await supabase.from("song_folders").select("sort_order").eq("user_id", user.id).eq("activity_id", activity.data.id).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const result = await supabase.from("song_folders").insert({
    user_id: user.id,
    activity_id: activity.data.id,
    name: titleCaseSongName(parsed.data.name),
    sort_order: (lastFolder.data?.sort_order ?? -1) + 1,
  }).select("id, name").single();
  if (result.error) {
    if (result.error.code === "42P01" || result.error.code === "PGRST205") return mutationError("Run migration 0022_song_folders_and_optional_difficulty.sql first.");
    if (result.error.code === "23505") return mutationError("A folder with that name already exists.");
    return mutationError(result.error.message);
  }

  revalidatePath("/");
  revalidatePath("/songs", "layout");
  return { success: true, error: null, folder: result.data };
}

export async function deleteSongFolderAction(folderId: string): Promise<MutationState> {
  const { supabase, user } = await getSignedInUser();
  if (!user) return mutationError("You need to sign in first.");

  const parsed = z.string().uuid().safeParse(folderId);
  if (!parsed.success) return mutationError("That folder could not be found.");
  const result = await supabase.from("song_folders").delete().eq("id", parsed.data).eq("user_id", user.id);
  if (result.error) return mutationError(result.error.message);

  revalidatePath("/");
  revalidatePath("/songs", "layout");
  return mutationSuccess();
}

export async function renameSongFolderAction(folderId: string, name: string): Promise<MutationState> {
  const { supabase, user } = await getSignedInUser();
  if (!user) return mutationError("You need to sign in first.");

  const parsed = z.object({ folderId: z.string().uuid(), name: folderSchema.shape.name }).safeParse({ folderId, name });
  if (!parsed.success) return mutationError(parsed.error.issues[0]?.message ?? "Check the folder name.");

  const result = await supabase.from("song_folders")
    .update({ name: titleCaseSongName(parsed.data.name) })
    .eq("id", parsed.data.folderId)
    .eq("user_id", user.id)
    .select("id, name")
    .maybeSingle();
  if (result.error?.code === "23505") return mutationError("A folder with that name already exists.");
  if (result.error) return mutationError(result.error.message);
  if (!result.data) return mutationError("That folder is no longer available.");

  revalidatePath("/songs");
  return { success: true, error: null, folder: result.data };
}

export async function setSongFolderOrderAction(folderIds: string[]): Promise<MutationState> {
  const { supabase, user } = await getSignedInUser();
  if (!user) return mutationError("You need to sign in first.");
  const parsed = z.array(z.string().uuid()).max(100).refine((ids) => new Set(ids).size === ids.length).safeParse(folderIds);
  if (!parsed.success) return mutationError("That folder order could not be saved.");

  const owned = await supabase.from("song_folders").select("id").eq("user_id", user.id).in("id", parsed.data);
  if (owned.error || (owned.data?.length ?? 0) !== parsed.data.length) return mutationError("One of those folders is no longer available.");
  const updates = await Promise.all(parsed.data.map((id, sortOrder) => supabase.from("song_folders").update({ sort_order: sortOrder }).eq("id", id).eq("user_id", user.id)));
  const failed = updates.find((result) => result.error);
  if (failed?.error) return mutationError(failed.error.message);
  revalidatePath("/songs");
  return mutationSuccess();
}

const moveSongSchema = z.object({
  itemId: z.string().uuid(),
  folderId: z.string().uuid().nullable(),
  orderedSongIds: z.array(z.string().uuid()).min(1).max(500)
    .refine((ids) => new Set(ids).size === ids.length),
});

export async function moveSongAction(itemId: string, folderId: string | null, orderedSongIds: string[]): Promise<MutationState> {
  const { supabase, user } = await getSignedInUser();
  if (!user) return mutationError("You need to sign in first.");
  const parsed = moveSongSchema.safeParse({ itemId, folderId, orderedSongIds });
  if (!parsed.success) return mutationError("That song order could not be saved.");
  if (!parsed.data.orderedSongIds.includes(parsed.data.itemId)) return mutationError("That song order could not be saved.");

  const item = await supabase.from("items").select("id, activity_id").eq("id", parsed.data.itemId).eq("user_id", user.id).maybeSingle();
  if (item.error || !item.data) return mutationError("That song is no longer available.");
  if (parsed.data.folderId) {
    const folder = await supabase.from("song_folders").select("id").eq("id", parsed.data.folderId).eq("user_id", user.id).eq("activity_id", item.data.activity_id).maybeSingle();
    if (folder.error || !folder.data) return mutationError("That folder is no longer available.");
  }
  const owned = await supabase.from("items").select("id").eq("user_id", user.id).eq("activity_id", item.data.activity_id).in("id", parsed.data.orderedSongIds);
  if (owned.error || (owned.data?.length ?? 0) !== parsed.data.orderedSongIds.length) return mutationError("One of those songs is no longer available.");

  const moved = await supabase.from("items").update({ folder_id: parsed.data.folderId }).eq("id", parsed.data.itemId).eq("user_id", user.id);
  if (moved.error) return mutationError(moved.error.message);
  const updates = await Promise.all(parsed.data.orderedSongIds.map((id, sortOrder) => supabase.from("items").update({ sort_order: sortOrder }).eq("id", id).eq("user_id", user.id)));
  const failed = updates.find((result) => result.error);
  if (failed?.error) return mutationError(failed.error.message);
  revalidatePath("/");
  revalidatePath("/songs");
  return mutationSuccess();
}

export async function setSongHiddenAction(itemId: string, isHidden: boolean): Promise<MutationState> {
  const { supabase, user } = await getSignedInUser();
  if (!user) return mutationError("You need to sign in first.");
  const parsed = z.object({ itemId: z.string().uuid(), isHidden: z.boolean() }).safeParse({ itemId, isHidden });
  if (!parsed.success) return mutationError("That song could not be updated.");
  const item = await supabase.from("items").select("id, activity_id, folder_id").eq("id", parsed.data.itemId).eq("user_id", user.id).maybeSingle();
  if (item.error || !item.data) return mutationError("That song is no longer available.");
  let lastSongQuery = supabase.from("items").select("sort_order").eq("user_id", user.id).eq("activity_id", item.data.activity_id).eq("is_archived", false);
  lastSongQuery = item.data.folder_id ? lastSongQuery.eq("folder_id", item.data.folder_id) : lastSongQuery.is("folder_id", null);
  const lastSong = await lastSongQuery.order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const result = await supabase.from("items").update({ is_hidden: parsed.data.isHidden, sort_order: (lastSong.data?.sort_order ?? -1) + 1 }).eq("id", parsed.data.itemId).eq("user_id", user.id).select("id").maybeSingle();
  if (result.error) return mutationError(result.error.code === "42703" ? "Run migration 0025_hidden_songs_and_folder_order.sql first." : result.error.message);
  if (!result.data) return mutationError("That song is no longer available.");
  revalidatePath("/");
  revalidatePath("/songs");
  return mutationSuccess();
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
    const { error: updateError } = await supabase.rpc("add_song_reference", { target_item_id: item.id, reference_url: parsed.data.youtubeUrl });

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
    defaultSongPublic: formData.get("defaultSongPublic") === "on",
    defaultResourcePublic: formData.get("defaultResourcePublic") === "on",
    defaultTuning: formData.get("defaultTuning") ?? "standard",
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
    default_song_public: parsed.data.defaultSongPublic,
    default_resource_public: parsed.data.defaultResourcePublic,
    default_tuning: parsed.data.defaultTuning,
  });

  if (error) {
    return mutationError(
      error.code === "42703" || error.code === "PGRST204"
        ? "Run migration 0024_user_preferences.sql before saving these settings."
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
    referenceUrls: formData.getAll("referenceUrl"),
  });
  if (!parsed.success) {
    return mutationError(parsed.error.issues[0]?.message ?? "Check the song details.");
  }

  const { error } = await supabase.rpc("replace_song_references", { target_item_id: parsed.data.itemId, reference_urls: parsed.data.referenceUrls });

  if (error) {
    return mutationError(
      error.code === "42703"
        ? "Run migration 0023_folder_order_and_song_references.sql before saving reference links."
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
    folderId: formData.get("folderId") ?? "",
    referenceUrls: formData.getAll("referenceUrl"),
    tuning: formData.get("tuning") ?? "standard",
    capo: formData.get("capo") ?? "",
  });
  if (!parsed.success) return mutationError(parsed.error.issues[0]?.message ?? "Check the song details.");

  const name = titleCaseSongName(parsed.data.name);

  const includeFolder = formData.has("folderId");
  const { error } = await supabase
    .from("items")
    .update({
      name,
      difficulty: parsed.data.difficulty,
      ...(includeFolder ? { folder_id: parsed.data.folderId } : {}),
      youtube_url: parsed.data.referenceUrls[0] ?? "",
      tuning: parsed.data.tuning || "standard",
      capo: parsed.data.capo,
    })
    .eq("id", parsed.data.itemId)
    .eq("user_id", user.id);

  if (error) {
    return mutationError(error.code === "42703" || error.code === "PGRST204" || error.code === "23502" ? "Run migration 0022_song_folders_and_optional_difficulty.sql before saving this song." : error.message);
  }

  const references = await supabase.rpc("replace_song_references", { target_item_id: parsed.data.itemId, reference_urls: parsed.data.referenceUrls });
  if (references.error) return mutationError("Run migration 0023_folder_order_and_song_references.sql before saving reference links.");

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
  const rawReturnHref = formData.get("returnHref");
  const returnHref = typeof rawReturnHref === "string" && rawReturnHref
    ? safeReturnPath(rawReturnHref)
    : null;

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
  if (returnHref) redirect(`${returnHref}${returnHref.includes("?") ? "&" : "?"}notice=song-deleted`);
  return mutationSuccess();
}

export async function bootstrapDataIfNeeded() {
  const { supabase, user } = await getSignedInUser();

  if (!user) {
    return;
  }

  await ensureSeedData(supabase, user.id);
}
