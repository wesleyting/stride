"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  clampRating,
  ensureSeedData,
  inferCurrentState,
  slugify,
} from "@/lib/stride";

export type MutationState = {
  success: boolean;
  error: string | null;
};

const authSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
});

const activitySchema = z.object({
  name: z.string().trim().min(2, "Activity names need at least 2 characters.").max(60),
  kind: z.enum(["practice", "journal", "fitness"]),
  description: z
    .string()
    .trim()
    .max(120, "Keep the description short.")
    .optional()
    .or(z.literal("")),
});

const itemSchema = z.object({
  name: z.string().trim().min(2, "Item names need at least 2 characters.").max(60),
  description: z
    .string()
    .trim()
    .max(120, "Keep the description short.")
    .optional()
    .or(z.literal("")),
});

const practiceSchema = z.object({
  note: z.string().trim().min(1, "Add a short note about your practice.").max(500),
  rating: z.coerce.number().int().min(1).max(5),
  activitySlug: z.string().trim().min(1),
  itemSlug: z.string().trim().min(1),
});

const activityDescriptionFallbacks: Record<
  z.infer<typeof activitySchema>["kind"],
  string
> = {
  practice: "Practicing regularly",
  journal: "Journal & reflection",
  fitness: "Building endurance",
};

function errorQuery(message: string) {
  return `?error=${encodeURIComponent(message)}`;
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
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(`/sign-in${errorQuery(parsed.error.issues[0]?.message ?? "Check your email and password.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    redirect(`/sign-in${errorQuery("Could not sign you in. Check your email and password.")}`);
  }

  redirect("/");
}

export async function signUpAction(formData: FormData) {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(`/sign-up${errorQuery(parsed.error.issues[0]?.message ?? "Check your email and password.")}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(parsed.data);

  if (error) {
    redirect(`/sign-up${errorQuery(error.message)}`);
  }

  if (data.session) {
    redirect("/");
  }

  redirect(`/sign-in?message=${encodeURIComponent("Account created. Check your email if confirmation is enabled.")}`);
}

export async function signOutAction() {
  const { supabase } = await getSignedInUser();
  await supabase.auth.signOut();
  redirect("/sign-in");
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
    description: formData.get("description") ?? "",
  });

  const activitySlug = String(formData.get("activitySlug") ?? "").trim();

  if (!parsed.success || !activitySlug) {
    const firstIssue = parsed.success ? null : parsed.error.issues[0];
    return mutationError(
      firstIssue?.message ?? "Choose an activity and give the item a name.",
    );
  }

  const { data: activity, error: activityError } = await supabase
    .from("activities")
    .select("id, slug")
    .eq("user_id", user.id)
    .eq("slug", activitySlug)
    .single();

  if (activityError || !activity) {
    return mutationError("That activity could not be found.");
  }

  const slug = slugify(parsed.data.name);

  const { error } = await supabase.from("items").insert({
    user_id: user.id,
    activity_id: activity.id,
    name: parsed.data.name,
    slug,
    description: parsed.data.description ?? "",
    focus: "",
    going_well: "",
    still_working_on: "",
    confidence: 3,
    sort_order: 999,
  });

  if (error) {
    return mutationError(error.message);
  }

  revalidatePath(`/${activitySlug}`);
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
    activitySlug: formData.get("activitySlug"),
    itemSlug: formData.get("itemSlug"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Add a note before saving.";
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
    .select(
      "id, activity_id, slug, focus, going_well, still_working_on, confidence",
    )
    .eq("user_id", user.id)
    .eq("activity_id", activity.id)
    .eq("slug", parsed.data.itemSlug)
    .single();

  if (itemError || !item) {
    return mutationError("That item could not be found.");
  }

  const normalizedNote = parsed.data.note.trim();
  const updatedState = inferCurrentState(normalizedNote, {
    focus: item.focus,
    going_well: item.going_well,
    still_working_on: item.still_working_on,
    confidence: item.confidence,
  });

  const { error: entryError } = await supabase.from("entries").insert({
    user_id: user.id,
    activity_id: activity.id,
    item_id: item.id,
    content: normalizedNote,
    rating: clampRating(parsed.data.rating),
  });

  if (entryError) {
    return mutationError(entryError.message);
  }

  const { error: updateError } = await supabase
    .from("items")
    .update({
      focus: updatedState.focus,
      going_well: updatedState.going_well,
      still_working_on: updatedState.still_working_on,
      confidence: clampRating(parsed.data.rating),
    })
    .eq("id", item.id)
    .eq("user_id", user.id);

  if (updateError) {
    return mutationError(updateError.message);
  }

  revalidatePath(`/${parsed.data.activitySlug}`);
  revalidatePath(`/${parsed.data.activitySlug}/${parsed.data.itemSlug}`);
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

  const itemId = String(formData.get("itemId") ?? "").trim();
  const itemSlug = String(formData.get("itemSlug") ?? "").trim();
  const activitySlug = String(formData.get("activitySlug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!itemId || !itemSlug || !activitySlug || name.length < 2) {
    return mutationError("Check the item details.");
  }

  const { error } = await supabase
    .from("items")
    .update({
      name,
      description,
    })
    .eq("id", itemId)
    .eq("user_id", user.id);

  if (error) {
    return mutationError(error.message);
  }

  revalidatePath(`/${activitySlug}`);
  revalidatePath(`/${activitySlug}/${itemSlug}`);
  return mutationSuccess();
}

export async function bootstrapDataIfNeeded() {
  const { supabase, user } = await getSignedInUser();

  if (!user) {
    return;
  }

  await ensureSeedData(supabase, user.id);
}
