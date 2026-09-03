"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Clock3, Gauge, Minus, Pause, Play, Plus, Square, TimerReset, X } from "lucide-react";
import { saveTimedPracticeAction } from "@/app/actions";
import { DialogShell } from "@/components/stride/dialog-shell";
import { PracticeTagInput } from "@/components/stride/practice-tag-input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TimerSession = {
  sessionId: string;
  itemId: string;
  itemSlug: string;
  itemName: string;
  startedAt: number | null;
  accumulatedSeconds: number;
};

type SongTimerTarget = Pick<TimerSession, "itemId" | "itemSlug" | "itemName">;

type TimerContextValue = {
  timer: TimerSession | null;
  elapsedSeconds: number;
  start: (target: SongTimerTarget, timestamp: number) => void;
};

const timerStorageKey = "stride-practice-timer-v1";
const TimerContext = createContext<TimerContextValue | null>(null);

export function PracticeTimerProvider({ children }: { children: React.ReactNode }) {
  const [timer, setTimer] = useState<TimerSession | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [hydrated, setHydrated] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [resumeAfterCancel, setResumeAfterCancel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [note, setNote] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [detailsResetSignal, setDetailsResetSignal] = useState(0);
  const finishFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const storedTimer = readStoredTimer();
    queueMicrotask(() => {
      setTimer(storedTimer);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    function syncTimer(event: StorageEvent) {
      if (event.key !== timerStorageKey) return;
      const nextTimer = parseStoredTimer(event.newValue);
      setTimer(nextTimer);
      setNow(Date.now());
      setFinishOpen(false);
      setDiscardOpen(false);
      setError("");
    }

    window.addEventListener("storage", syncTimer);
    return () => window.removeEventListener("storage", syncTimer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (timer) window.localStorage.setItem(timerStorageKey, JSON.stringify(timer));
    else window.localStorage.removeItem(timerStorageKey);
  }, [hydrated, timer]);

  useEffect(() => {
    if (!timer?.startedAt) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [timer?.startedAt]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const elapsedSeconds = timer
    ? timer.accumulatedSeconds +
      (timer.startedAt ? Math.max(0, Math.floor((now - timer.startedAt) / 1000)) : 0)
    : 0;

  function start(target: SongTimerTarget, timestamp: number) {
    const existingTimer = readStoredTimer();
    if (timer || existingTimer) {
      if (!timer && existingTimer) setTimer(existingTimer);
      setNotice(`Finish ${timer?.itemName ?? existingTimer?.itemName ?? "the current song"} before starting another timer.`);
      return;
    }
    const nextTimer = { ...target, sessionId: crypto.randomUUID(), startedAt: timestamp, accumulatedSeconds: 0 };
    setNow(timestamp);
    window.localStorage.setItem(timerStorageKey, JSON.stringify(nextTimer));
    setTimer(nextTimer);
    setError("");
    resetDetails();
  }

  function pause() {
    if (!timer?.startedAt) return;
    const timestamp = Date.now();
    setTimer({
      ...timer,
      accumulatedSeconds:
        timer.accumulatedSeconds + Math.max(0, Math.floor((timestamp - timer.startedAt) / 1000)),
      startedAt: null,
    });
    setNow(timestamp);
  }

  function resume() {
    if (!timer || timer.startedAt) return;
    const timestamp = Date.now();
    setTimer({ ...timer, startedAt: timestamp });
    setNow(timestamp);
  }

  function requestFinish() {
    if (!timer) return;
    const wasRunning = Boolean(timer.startedAt);
    if (wasRunning) pause();
    setResumeAfterCancel(wasRunning);
    setError("");
    setFinishOpen(true);
  }

  function cancelFinish() {
    setFinishOpen(false);
    if (resumeAfterCancel) {
      const timestamp = Date.now();
      setNow(timestamp);
      setTimer((current) =>
        current && !current.startedAt ? { ...current, startedAt: timestamp } : current,
      );
    }
    setResumeAfterCancel(false);
  }

  function resumeFromFinish() {
    const timestamp = Date.now();
    setFinishOpen(false);
    setResumeAfterCancel(false);
    setNow(timestamp);
    setTimer((current) => current ? { ...current, startedAt: timestamp } : current);
  }

  async function saveSession() {
    if (!timer) return;
    setSaving(true);
    setError("");
    const durationSeconds = Math.max(1, timer.accumulatedSeconds);
    const details = finishFormRef.current ? new FormData(finishFormRef.current) : null;
    const result = await saveTimedPracticeAction({
      sessionId: timer.sessionId,
      itemId: timer.itemId,
      itemSlug: timer.itemSlug,
      durationSeconds,
      note,
      rating,
      practicePart: String(details?.get("practicePart") ?? ""),
    });
    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "The timed session could not be saved.");
      return;
    }

    setFinishOpen(false);
    setResumeAfterCancel(false);
    setTimer(null);
    resetDetails();
    setNotice(`${formatStopwatch(durationSeconds)} saved to ${timer.itemName}.`);
  }

  function discard() {
    setDiscardOpen(false);
    setFinishOpen(false);
    setResumeAfterCancel(false);
    setTimer(null);
    setError("");
    resetDetails();
  }

  function resetDetails() {
    setShowDetails(false);
    setNote("");
    setRating(null);
    setDetailsResetSignal((value) => value + 1);
  }

  const contextValue = { timer, elapsedSeconds, start };

  return (
    <TimerContext.Provider value={contextValue}>
      <div className={cn("min-h-full transition-[padding]", timer && "pt-14")}>
        {children}
      </div>

      {timer ? (
        <div className="fixed inset-x-0 top-0 z-40 border-b border-stone-700 bg-stone-950 text-white shadow-lg">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-3 sm:px-5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <Clock3 className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{timer.itemName}</p>
              <p className="text-[0.6875rem] text-stone-400">
                {timer.startedAt ? "Practice timer running" : "Practice timer paused"}
              </p>
            </div>
            <output
              aria-live="off"
              className="min-w-18 text-center font-mono text-base font-semibold tabular-nums sm:text-lg"
            >
              {formatStopwatch(elapsedSeconds)}
            </output>
            <button
              type="button"
              onClick={timer.startedAt ? pause : resume}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-white hover:bg-white/10 hover:text-white",
              )}
            >
              {timer.startedAt ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
              <span className="hidden sm:inline">{timer.startedAt ? "Pause" : "Resume"}</span>
            </button>
            <button
              type="button"
              onClick={requestFinish}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "border-white/25 bg-white text-stone-950 hover:bg-stone-200",
              )}
            >
              <Square aria-hidden="true" />
              Finish
            </button>
            <button
              type="button"
              onClick={() => setDiscardOpen(true)}
              aria-label="Discard practice timer"
              title="Discard timer"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-sm" }),
                "text-stone-400 hover:bg-white/10 hover:text-white",
              )}
            >
              <X aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}

      {notice ? (
        <div role="status" className="fixed right-4 bottom-4 z-40 rounded-lg bg-stone-950 px-4 py-3 text-sm font-medium text-white shadow-xl">
          {notice}
        </div>
      ) : null}

      <DialogShell open={finishOpen} onOpenChange={(next) => next ? setFinishOpen(true) : cancelFinish()} title="Finish Practice?" size="md">
        <form
          ref={finishFormRef}
          onSubmit={(event) => {
            event.preventDefault();
            void saveSession();
          }}
          className="grid gap-5"
        >
          <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-5 text-center">
            <TimerReset className="mx-auto size-5 text-stone-500" aria-hidden="true" />
            <p className="mt-2 text-3xl font-semibold tabular-nums text-stone-950">
              {formatStopwatch(timer?.accumulatedSeconds ?? 0)}
            </p>
            <p className="mt-1 text-sm text-stone-500">
              This will add a timed entry to {timer?.itemName}.
            </p>
          </div>
          <div className="border-t border-stone-200 pt-4">
            <button
              type="button"
              onClick={() => setShowDetails((visible) => !visible)}
              aria-expanded={showDetails}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              {showDetails ? <Minus data-icon="inline-start" aria-hidden="true" /> : <Plus data-icon="inline-start" aria-hidden="true" />}
              {showDetails ? "Hide Details" : "Add Details"}
            </button>
          </div>
          {showDetails ? (
            <div className="grid gap-5 rounded-xl border border-stone-200 bg-stone-50 p-4">
              <label className="text-sm font-semibold text-stone-900">
                Practice Note <span className="font-normal text-stone-500">Optional</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="What improved, what was difficult, or anything worth remembering…"
                  className="mt-1.5 w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm leading-6 text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 hover:border-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20"
                />
              </label>
              <fieldset className="rounded-xl border border-stone-200 bg-white px-4 py-3">
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                    <Gauge className="size-4 text-stone-500" aria-hidden="true" />
                    Session Rating
                    <span className="font-normal text-stone-500">Optional</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={rating !== null}
                    onChange={(event) => setRating(event.target.checked ? 6 : null)}
                    className="size-4 accent-stone-900"
                  />
                </label>
                {rating !== null ? (
                  <div className="mt-3 border-t border-stone-100 pt-3">
                    <div className="flex items-baseline justify-end">
                      <output className="text-xl font-semibold tabular-nums text-stone-950">
                        {rating}<span className="text-xs font-normal text-stone-400">/10</span>
                      </output>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={rating}
                      onChange={(event) => setRating(Number(event.target.value))}
                      aria-label="Session rating out of 10"
                      className="mt-2 h-2 w-full cursor-pointer accent-stone-900"
                    />
                    <div className="mt-1 flex justify-between text-[0.7rem] text-stone-400">
                      <span>Tough</span>
                      <span>Great</span>
                    </div>
                  </div>
                ) : null}
              </fieldset>
              <PracticeTagInput key={detailsResetSignal} name="practicePart" suggestions={[]} optional />
            </div>
          ) : null}
          {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
          <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
            <button type="button" onClick={resumeFromFinish} className={cn(buttonVariants({ variant: "secondary" }), "bg-amber-100 text-amber-950 hover:bg-amber-200")}>
              <Play data-icon="inline-start" aria-hidden="true" />
              Resume Timer
            </button>
            <button type="submit" disabled={saving} className={buttonVariants()}>
              {saving ? "Saving…" : "Save Session"}
            </button>
          </div>
        </form>
      </DialogShell>

      <DialogShell open={discardOpen} onOpenChange={setDiscardOpen} title="Discard Timer?" size="md">
        <div className="grid gap-5">
          <p className="text-sm leading-6 text-stone-600">
            The current time for {timer?.itemName} will not be added to your practice log.
          </p>
          <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
            <button type="button" onClick={() => setDiscardOpen(false)} className={buttonVariants({ variant: "outline" })}>
              Keep Timer
            </button>
            <button type="button" onClick={discard} className={buttonVariants({ variant: "destructive" })}>
              Discard
            </button>
          </div>
        </div>
      </DialogShell>
    </TimerContext.Provider>
  );
}

export function StartPracticeTimerButton({
  itemId,
  itemSlug,
  itemName,
  compact = false,
}: SongTimerTarget & { compact?: boolean }) {
  const context = usePracticeTimer();
  const sameSong = context.timer?.itemId === itemId;
  const anotherSong = Boolean(context.timer && !sameSong);

  return (
    <button
      type="button"
      onClick={() => context.start({ itemId, itemSlug, itemName }, Date.now())}
      disabled={Boolean(context.timer)}
      title={
        sameSong
          ? `Timer running for ${itemName}`
          : anotherSong
            ? `Finish ${context.timer?.itemName} first`
            : `Start a timer for ${itemName}`
      }
      className={buttonVariants({
        variant: "outline",
        size: compact ? "sm" : "default",
      })}
    >
      <Clock3 data-icon="inline-start" aria-hidden="true" />
      {sameSong ? "Running" : compact ? "Timer" : "Start Timer"}
    </button>
  );
}

function usePracticeTimer() {
  const context = useContext(TimerContext);
  if (!context) throw new Error("Practice timer controls require PracticeTimerProvider.");
  return context;
}

function formatStopwatch(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  return hours
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function parseStoredTimer(value: string | null): TimerSession | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<TimerSession>;
    if (!parsed.itemId || !parsed.itemSlug || !parsed.itemName) return null;
    return {
      sessionId: parsed.sessionId || crypto.randomUUID(),
      itemId: parsed.itemId,
      itemSlug: parsed.itemSlug,
      itemName: parsed.itemName,
      startedAt: typeof parsed.startedAt === "number" ? parsed.startedAt : null,
      accumulatedSeconds: typeof parsed.accumulatedSeconds === "number" ? Math.max(0, parsed.accumulatedSeconds) : 0,
    };
  } catch {
    return null;
  }
}

function readStoredTimer() {
  const timer = parseStoredTimer(window.localStorage.getItem(timerStorageKey));
  if (!timer) window.localStorage.removeItem(timerStorageKey);
  return timer;
}
