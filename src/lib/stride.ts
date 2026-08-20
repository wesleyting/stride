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
  description: string;
  focus: string;
  going_well: string;
  still_working_on: string;
  confidence: number;
  difficulty: number;
  sort_order: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type EntryRecord = {
  id: string;
  activity_id: string;
  item_id: string | null;
  content: string;
  rating: number | null;
  practice_part: string | null;
  created_at: string;
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

type StateSource = {
  focus: string;
  going_well: string;
  still_working_on: string;
  confidence: number;
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
    description: "Working on the second section",
    focus: "Second section / picking pattern",
    going_well: "Picking pattern is becoming more consistent",
    still_working_on: "Transition into the second section",
    confidence: 3,
    sort_order: 0,
  },
  {
    activitySlug: "guitar",
    name: "Tears in Heaven",
    slug: "tears-in-heaven",
    description: "Learning the intro",
    focus: "Learning the intro",
    going_well: "Chord changes are smoother",
    still_working_on: "Clean hammer-ons in the intro",
    confidence: 2,
    sort_order: 1,
  },
  {
    activitySlug: "guitar",
    name: "Fast Car",
    slug: "fast-car",
    description: "Getting comfortable singing while playing",
    focus: "Singing while playing",
    going_well: "Chord changes stay steady",
    still_working_on: "Breath control through the chorus",
    confidence: 3,
    sort_order: 2,
  },
  {
    activitySlug: "guitar",
    name: "House of the Rising Sun",
    slug: "house-of-the-rising-sun",
    description: "On the back burner",
    focus: "Keeping the groove even",
    going_well: "Bass notes are clear",
    still_working_on: "Strumming consistency",
    confidence: 2,
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

export function inferCurrentState(note: string, previous: StateSource) {
  const lower = note.toLowerCase();
  const clauses = note
    .split(/[.!?]+/)
    .flatMap((sentence) => sentence.split(/\b(?:but|although|however)\b/i))
    .map((clause) =>
      clause
        .trim()
        .replace(/^[,;:\s-]+|[,;:\s-]+$/g, "")
        .replace(/^the\s+/i, "")
        .replace(/\s+/g, " "),
    )
    .filter(Boolean);

  let focus = previous.focus;
  if (lower.includes("second section") && lower.includes("picking")) {
    focus = "Second section / picking pattern";
  } else if (lower.includes("transition") && lower.includes("second section")) {
    focus = "Transition into the second section";
  } else if (lower.includes("picking")) {
    focus = "Picking pattern";
  } else {
    const focusClause = clauses.find((clause) =>
      [/worked on/i, /practiced/i, /focused on/i, /working on/i].some((pattern) =>
        pattern.test(clause),
      ),
    );

    if (focusClause) {
      focus = focusClause.charAt(0).toUpperCase() + focusClause.slice(1);
    }
  }

  const positiveClause = clauses.find((clause) =>
    [
      /felt smoother/i,
      /went well/i,
      /better/i,
      /comfortable/i,
      /improved/i,
      /cleaner/i,
      /coming along/i,
      /steadier/i,
    ].some((pattern) => pattern.test(clause)),
  );

  const challengeClause = clauses.find((clause) =>
    [
      /still/i,
      /hard/i,
      /awkward/i,
      /struggl/i,
      /difficult/i,
      /rough/i,
      /needs work/i,
    ].some((pattern) => pattern.test(clause)),
  );

  return {
    focus,
    going_well: positiveClause ?? previous.going_well,
    still_working_on: challengeClause ?? previous.still_working_on,
  };
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
        description: item.description,
        focus: item.focus,
        going_well: item.going_well,
        still_working_on: item.still_working_on,
        confidence: item.confidence,
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
