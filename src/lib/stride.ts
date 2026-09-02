import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityKind = "practice" | "journal" | "fitness" | "projects";

export type ActivityRecord = {
  id: string;
  name: string;
  slug: string;
  kind: ActivityKind;
  description: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ItemRecord = {
  id: string;
  activity_id: string;
  name: string;
  slug: string;
  difficulty: number;
  is_favorite: boolean;
  pin_position: number | null;
  youtube_url: string;
  tuning: string;
  capo: number | null;
  sort_order: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export const GUITAR_TUNINGS = [
  { value: "standard", label: "Standard", notes: "E A D G B E" },
  { value: "half-step-down", label: "Half Step Down", notes: "E♭ A♭ D♭ G♭ B♭ E♭" },
  { value: "whole-step-down", label: "Whole Step Down", notes: "D G C F A D" },
  { value: "drop-d", label: "Drop D", notes: "D A D G B E" },
  { value: "double-drop-d", label: "Double Drop D", notes: "D A D G B D" },
  { value: "dadgad", label: "DADGAD", notes: "D A D G A D" },
  { value: "open-c", label: "Open C", notes: "C G C G C E" },
  { value: "open-d", label: "Open D", notes: "D A D F♯ A D" },
  { value: "open-e", label: "Open E", notes: "E B E G♯ B E" },
  { value: "open-g", label: "Open G", notes: "D G D G B D" },
] as const;

export type GuitarTuning = (typeof GUITAR_TUNINGS)[number]["value"];

export function formatTuning(value?: string | null) {
  return GUITAR_TUNINGS.find((tuning) => tuning.value === value) ?? GUITAR_TUNINGS[0];
}

export type SongResourceRecord = {
  id: string;
  item_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  is_public?: boolean;
  created_at: string;
  signed_url?: string;
};

export function calculatePracticeStreak(createdDates: string[]) {
  if (createdDates.length === 0) return 0;

  const dayKeys = new Set(
    createdDates.map((value) => {
      const date = new Date(value);
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    }),
  );
  const cursor = new Date();
  const todayKey = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
  cursor.setDate(cursor.getDate() - 1);
  const yesterdayKey = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;

  if (!dayKeys.has(todayKey) && !dayKeys.has(yesterdayKey)) return 0;
  if (dayKeys.has(todayKey)) cursor.setDate(cursor.getDate() + 1);

  let streak = 0;
  while (true) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
    if (!dayKeys.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function entriesWithinDays<T extends { created_at: string }>(entries: T[], days: number) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return entries.filter((entry) => new Date(entry.created_at).getTime() >= cutoff);
}

export function formatCompactLogDate(value: string) {
  const date = new Date(value);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysAgo = Math.floor((startOfToday.getTime() - startOfDate.getTime()) / 86400000);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date).replace(" AM", "AM").replace(" PM", "PM");

  if (daysAgo === 0) return `Today, ${time}`;
  if (daysAgo === 1) return `Yesterday, ${time}`;
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
  if (daysAgo > 1 && daysAgo < 7) return `${weekday}, ${time}`;
  if (daysAgo >= 7 && daysAgo < 14) return `Last ${weekday}, ${time}`;
  return `${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date)}, ${time}`;
}

export type EntryRecord = {
  id: string;
  activity_id: string;
  item_id: string | null;
  content: string;
  rating: number | null;
  practice_part: string | null;
  duration_seconds?: number | null;
  created_at: string;
};

export type PublicProfileRecord = {
  username: string;
  display_name: string;
  bio: string;
  share_song_library?: boolean;
  share_practice_logs?: boolean;
  share_song_resources?: boolean;
  tracked_seconds: number;
  tracked_seconds_7d: number;
  timed_sessions: number;
  active_days_30?: number;
};

export type ActivitySummary = ActivityRecord & {
  item_count: number;
  last_active_label: string;
  summary: string;
};

export type ActivityDetail = ActivityRecord & {
  items: ItemRecord[];
  entries: EntryRecord[];
  item_count: number;
  last_active_label: string;
};

export type ItemDetail = {
  activity: ActivityRecord;
  item: ItemRecord;
  entries: EntryRecord[];
};

const millisecondsPerDay = 1000 * 60 * 60 * 24;

const seedActivities = [
  {
    name: "Guitar",
    slug: "guitar",
    kind: "practice" as const,
    description: "Practicing regularly",
    sort_order: 0,
  },
  {
    name: "Running",
    slug: "running",
    kind: "fitness" as const,
    description: "Building endurance",
    sort_order: 1,
  },
  {
    name: "Wellbeing",
    slug: "wellbeing",
    kind: "journal" as const,
    description: "Journal & reflection",
    sort_order: 2,
  },
  {
    name: "Piano",
    slug: "piano",
    kind: "practice" as const,
    description: "Learning & practice",
    sort_order: 3,
  },
  {
    name: "Development",
    slug: "development",
    kind: "practice" as const,
    description: "Side projects & learning",
    sort_order: 4,
  },
];

const seedItems = [
  {
    activitySlug: "guitar",
    name: "Blackbird",
    slug: "blackbird",
    sort_order: 0,
  },
  {
    activitySlug: "guitar",
    name: "Tears in Heaven",
    slug: "tears-in-heaven",
    sort_order: 1,
  },
  {
    activitySlug: "guitar",
    name: "Fast Car",
    slug: "fast-car",
    sort_order: 2,
  },
  {
    activitySlug: "guitar",
    name: "House of the Rising Sun",
    slug: "house-of-the-rising-sun",
    sort_order: 3,
  },
];

const seedEntries = [
  {
    activitySlug: "guitar",
    itemSlug: "blackbird",
    content:
      "Worked mostly on the second section. Picking is coming along but the transition still feels awkward.",
    rating: 4,
    dayOffset: 1,
  },
  {
    activitySlug: "guitar",
    itemSlug: "fast-car",
    content: "Practiced chord changes and singing while playing. The groove felt steadier.",
    rating: 3,
    dayOffset: 1,
  },
  {
    activitySlug: "guitar",
    itemSlug: "tears-in-heaven",
    content:
      "Cleaned up the intro slowly and got a little more comfortable with the timing.",
    rating: 3,
    dayOffset: 2,
  },
];

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function titleCaseSongName(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (word.length > 1 && word === word.toUpperCase()) return word;
      return word
        .split("-")
        .map((part) =>
          part ? `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}` : part,
        )
        .join("-");
    })
    .join(" ");
}

export function clampRating(value: number, maximum = 5) {
  return Math.min(maximum, Math.max(1, value));
}

const proficiencyLabels = [
  "Learning",
  "Rough",
  "Developing",
  "Comfortable",
  "Performance-ready",
] as const;

export function describeProficiency(level: number) {
  return proficiencyLabels[clampRating(level) - 1];
}

export function describeActivityKind(kind: ActivityKind) {
  switch (kind) {
    case "practice":
      return "Practice";
    case "journal":
      return "Journal";
    case "fitness":
      return "Fitness";
    case "projects":
      return "Projects";
  }
}

export function formatRelativeDate(input: string | Date, now = new Date()) {
  const date = typeof input === "string" ? new Date(input) : input;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const difference = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / millisecondsPerDay,
  );

  if (difference === 0) return "Today";
  if (difference === 1) return "Yesterday";
  if (difference > 1 && difference < 7) return `${difference} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatActivityLastActive(entries: EntryRecord[], fallback: string) {
  if (entries.length === 0) {
    return fallback;
  }

  return formatRelativeDate(entries[0].created_at);
}

export function formatEntryDisplay(date: string, now = new Date()) {
  const entryDate = new Date(date);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(
    entryDate.getFullYear(),
    entryDate.getMonth(),
    entryDate.getDate(),
  );
  const difference = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / millisecondsPerDay,
  );

  const detail = entryDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const time = entryDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (difference === 0) return { label: "Today", detail, time };
  if (difference === 1) return { label: "Yesterday", detail, time };
  if (difference > 1 && difference < 7) {
    return { label: `${difference} days ago`, detail, time };
  }

  return { label: detail, detail: "", time };
}

export function formatEntryMoment(date: string) {
  const display = formatEntryDisplay(date);
  return `${display.label} at ${display.time}`;
}

export function formatTrackedTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0) return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return safeSeconds > 0 ? "<1m" : "0m";
}

export function buildActivitySummary(activity: ActivityRecord, itemCount: number) {
  if (activity.kind === "practice") {
    if (itemCount === 0) {
      return activity.description;
    }

    const songLabel = itemCount === 1 ? "song" : "songs";
    return `${itemCount} ${songLabel} · ${activity.description}`;
  }

  return activity.description;
}

export async function ensureSeedData(supabase: SupabaseClient, userId: string) {
  const { data: existingActivities, error } = await supabase
    .from("activities")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (error) {
    throw error;
  }

  if (existingActivities && existingActivities.length > 0) {
    return;
  }

  const activityIds = new Map<string, string>();

  for (const activity of seedActivities) {
    const { data, error: insertError } = await supabase
      .from("activities")
      .insert({
        user_id: userId,
        ...activity,
      })
      .select("id, slug")
      .single();

    if (insertError) {
      throw insertError;
    }

    activityIds.set(data.slug, data.id);
  }

  const itemIds = new Map<string, string>();

  for (const item of seedItems) {
    const activityId = activityIds.get(item.activitySlug);

    if (!activityId) {
      continue;
    }

    const { data, error: insertError } = await supabase
      .from("items")
      .insert({
        user_id: userId,
        activity_id: activityId,
        name: item.name,
        slug: item.slug,
        difficulty: 3,
        sort_order: item.sort_order,
      })
      .select("id, slug")
      .single();

    if (insertError) {
      throw insertError;
    }

    itemIds.set(data.slug, data.id);
  }

  for (const entry of seedEntries) {
    const activityId = activityIds.get(entry.activitySlug);
    const itemId = itemIds.get(entry.itemSlug);

    if (!activityId || !itemId) {
      continue;
    }

    const createdAt = new Date(
      Date.now() - entry.dayOffset * millisecondsPerDay,
    ).toISOString();

    const { error: insertError } = await supabase.from("entries").insert({
      user_id: userId,
      activity_id: activityId,
      item_id: itemId,
      content: entry.content,
      rating: entry.rating,
      created_at: createdAt,
    });

    if (insertError) {
      throw insertError;
    }
  }
}
