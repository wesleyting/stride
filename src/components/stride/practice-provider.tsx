"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type PracticeEntry = {
  id: string;
  date: string;
  dateDetail: string;
  note: string;
  rating: number;
};

export type BlackbirdState = {
  focus: string;
  goingWell: string;
  stillWorkingOn: string;
  confidence: number;
  lastPracticed: string;
  recentProgress: PracticeEntry[];
  updateNotice: string | null;
};

type PracticeContextValue = {
  blackbird: BlackbirdState;
  logPractice: (note: string, rating: number) => void;
};

const initialBlackbird: BlackbirdState = {
  focus: "Second section / picking pattern",
  goingWell: "Picking pattern is becoming more consistent",
  stillWorkingOn: "Transition into the second section",
  confidence: 3,
  lastPracticed: "Yesterday",
  recentProgress: [
    {
      id: "blackbird-may-20",
      date: "Yesterday",
      dateDetail: "May 20",
      note: "Focused on the transition. Slight improvement.",
      rating: 3,
    },
    {
      id: "blackbird-may-18",
      date: "May 18",
      dateDetail: "",
      note: "Practiced slowly. Cleaned up a few mistakes in the picking pattern.",
      rating: 3,
    },
  ],
  updateNotice: null,
};

const PracticeContext = createContext<PracticeContextValue | null>(null);

function tidyClause(value: string) {
  const trimmed = value
    .trim()
    .replace(/^[,;:\s-]+|[,;:\s-]+$/g, "")
    .replace(/^the\s+/i, "")
    .replace(/\s+/g, " ");

  if (!trimmed) return "";

  const concise = trimmed.length > 92 ? `${trimmed.slice(0, 89).trim()}…` : trimmed;
  return concise.charAt(0).toUpperCase() + concise.slice(1);
}

function clausesFrom(note: string) {
  return note
    .split(/[.!?]+/)
    .flatMap((sentence) => sentence.split(/\b(?:but|although|however)\b/i))
    .map(tidyClause)
    .filter(Boolean);
}

function findClause(clauses: string[], patterns: RegExp[]) {
  return clauses.find((clause) =>
    patterns.some((pattern) => pattern.test(clause.toLowerCase())),
  );
}

function inferCurrentState(note: string, previous: BlackbirdState) {
  const lower = note.toLowerCase();
  const clauses = clausesFrom(note);

  let focus = previous.focus;
  if (lower.includes("second section") && lower.includes("picking")) {
    focus = "Second section / picking pattern";
  } else if (lower.includes("transition") && lower.includes("second section")) {
    focus = "Transition into the second section";
  } else if (lower.includes("picking")) {
    focus = "Picking pattern";
  } else {
    const focusClause = findClause(clauses, [
      /worked on/,
      /practiced/,
      /focused on/,
      /working on/,
    ]);
    if (focusClause) focus = focusClause;
  }

  const positiveClause = findClause(clauses, [
    /felt smoother/,
    /went well/,
    /better/,
    /comfortable/,
    /improved/,
    /cleaner/,
    /coming along/,
  ]);

  const challengeClause = findClause(clauses, [
    /still/,
    /hard/,
    /awkward/,
    /struggl/,
    /difficult/,
    /rough/,
    /needs work/,
  ]);

  return {
    focus,
    goingWell: positiveClause ?? previous.goingWell,
    stillWorkingOn: challengeClause ?? previous.stillWorkingOn,
  };
}

export function PracticeProvider({ children }: { children: ReactNode }) {
  const [blackbird, setBlackbird] = useState(initialBlackbird);

  function logPractice(note: string, rating: number) {
    const normalizedNote = note.trim();
    const entryId = `blackbird-${Date.now()}`;

    setBlackbird((previous) => {
      const inferred = inferCurrentState(normalizedNote, previous);
      const needsMilestoneConfirmation =
        /\b(mastered?|complete(?:d)?|finished)\b/i.test(normalizedNote);

      return {
        ...previous,
        ...inferred,
        confidence: rating,
        lastPracticed: "Today",
        recentProgress: [
          {
            id: entryId,
            date: "Today",
            dateDetail: "May 21",
            note: normalizedNote,
            rating,
          },
          ...previous.recentProgress,
        ],
        updateNotice: needsMilestoneConfirmation
          ? "Practice logged. Completion was not changed—important milestones need your confirmation."
          : "Practice logged. Blackbird’s current state was updated from your note.",
      };
    });
  }

  const value = useMemo(
    () => ({ blackbird, logPractice }),
    [blackbird],
  );

  return (
    <PracticeContext.Provider value={value}>
      {children}
    </PracticeContext.Provider>
  );
}

export function usePractice() {
  const context = useContext(PracticeContext);

  if (!context) {
    throw new Error("usePractice must be used inside PracticeProvider");
  }

  return context;
}
